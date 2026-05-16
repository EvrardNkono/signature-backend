// controllers/paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Order } = require('../routes/orderRoutes'); // ← Import depuis orderRoutes
const fetch = require('node-fetch');

// ==================== CREATE CHECKOUT SESSION ====================
exports.createCheckoutSession = async (req, res) => {
    try {
        const { items, orderId } = req.body;

        // --- INTELLIGENCE AUTO-DÉTECTION ---
        const frontendUrl = process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL || "https://restaurantsignature.fr"
            : "http://localhost:5173";

        const line_items = items.map(item => {
            const priceData = {
                currency: 'eur',
                unit_amount: Math.round(item.price * 100),
                product_data: { 
                    name: item.name,
                },
            };

            if (item.chosenAccompaniment && item.chosenAccompaniment !== "Aucun") {
                priceData.product_data.description = `Acc: ${item.chosenAccompaniment}`;
            }

            return {
                price_data: priceData,
                quantity: item.quantity,
            };
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            metadata: { orderId: orderId },
            success_url: `${frontendUrl}/order-success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
            cancel_url: `${frontendUrl}/panier?canceled=true`,
        });

        res.status(200).json({ url: session.url });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ 
            message: "Erreur lors de la création de la session de paiement",
            error: error.message 
        });
    }
};

// ==================== WEBHOOK STRIPE ====================
exports.handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET non configuré');
        return res.status(500).send('Webhook secret manquant');
    }
    
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.log(`⚠️ Erreur webhook: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gérer le paiement réussi
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata.orderId;
        
        console.log(`✅ Paiement réussi pour la commande ${orderId}`);
        
        try {
            // 1. Mettre à jour la commande
            const order = await Order.findByIdAndUpdate(orderId, { 
                status: "pending",
                "details.paymentStatus": "paid"
            }, { new: true });
            
            if (!order) {
                console.log(`⚠️ Commande ${orderId} non trouvée`);
                return res.json({ received: true });
            }
            
            console.log(`📦 Commande ${orderId} mise à jour: status=pending, paymentStatus=paid`);
            
            // 2. 🔔 ENVOYER LA NOTIFICATION À L'ADMIN
            const isLocal = process.env.NODE_ENV !== 'production';
            const BASE_API = isLocal ? "http://localhost:5000/api" : "https://signature-backend-alpha.vercel.app/api";
            
            // Déterminer le mode d'affichage
            let modeText = "Sur place";
            if (order.mode === "delivery") modeText = "Livraison";
            else if (order.mode === "booking") modeText = "Réservation";
            
            const notificationData = {
                orderId: orderId,
                customerName: order.customer?.name || "Client",
                total: order.total,
                itemsCount: order.items?.length || 0,
                mode: modeText,
                tableNumber: order.details?.tableNumber || null,
                paymentMethod: "Stripe (carte)"
            };
            
            console.log(`📨 Envoi notification admin:`, notificationData);
            
            // Appel vers la route de notification
            const response = await fetch(`${BASE_API}/notifications/new-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notificationData)
            });
            
            if (response.ok) {
                console.log(`✅ Notification admin envoyée pour commande ${orderId}`);
            } else {
                console.log(`⚠️ Échec envoi notification: ${response.status}`);
            }
            
        } catch (error) {
            console.error(`❌ Erreur traitement commande ${orderId}:`, error);
        }
    }

    res.json({ received: true });
};