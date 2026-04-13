const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
    try {
        const { items, orderId } = req.body;

        // --- INTELLIGENCE AUTO-DÉTECTION ---
        // Si NODE_ENV est 'production', on utilise l'URL réelle, sinon localhost.
        // La plupart des hébergeurs (Vercel, Render, etc.) règlent NODE_ENV sur 'production' automatiquement.
        const frontendUrl = process.env.NODE_ENV === 'production'
            ? "https://ton-site-signature.fr" // Remplace par ton vrai nom de domaine
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
            // Utilisation de l'URL détectée automatiquement
            success_url: `${frontendUrl}/order-success?orderId=${orderId}`,
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