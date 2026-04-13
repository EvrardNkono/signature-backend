const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
    try {
        const { items, orderId, amountCustom } = req.body;

        const line_items = items.map(item => {
            // On crée un objet de base pour price_data
            const priceData = {
                currency: 'eur',
                unit_amount: Math.round(item.price * 100),
                product_data: { 
                    name: item.name,
                },
            };

            // On n'ajoute la description QUE si elle contient du texte utile
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
            success_url: `${process.env.FRONTEND_URL}/order-success?orderId=${orderId}`,
            cancel_url: `${process.env.FRONTEND_URL}/cart?canceled=true`,
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