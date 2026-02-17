const axios = require('axios');

/**
 * Récupère le Token d'accès Uber (Client Credentials)
 */
const getUberToken = async () => {
    try {
        const authUrl = (process.env.UBER_AUTH_URL || "https://login.uber.com/oauth/v2/token").trim();
        
        const params = new URLSearchParams();
        params.append('client_id', process.env.UBER_CLIENT_ID?.trim());
        params.append('client_secret', process.env.UBER_CLIENT_SECRET?.trim());
        params.append('grant_type', 'client_credentials');
        params.append('scope', 'delivery');

        const res = await axios.post(authUrl, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        return res.data.access_token;
    } catch (error) {
        console.error("Erreur Auth Uber détaillée:", error.response?.data || error.message);
        throw new Error("Échec de l'authentification Uber.");
    }
};

/**
 * Demande un devis de livraison (Quote)
 */
const getDeliveryEstimate = async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) return res.status(400).json({ error: "Adresse manquante." });

        // --- BLOC DE SIMULATION (MOCK) ---
        // Ce bloc permet à ton site à Melun de fonctionner malgré l'absence d'autorisation Uber
        if (process.env.NODE_ENV === 'development') {
            console.log("🛠️  Simulation active pour l'adresse :", address);
            
            // On simule un léger délai pour le réalisme de l'interface
            await new Promise(resolve => setTimeout(resolve, 800));

            return res.json({
                fee: 8.50, // Forfait test pour Melun
                quoteId: "mock_quote_signature_" + Math.random().toString(36).substr(2, 5),
                estimatedArrival: new Date(Date.now() + 45 * 60000).toISOString(),
                currency: "EUR"
            });
        }
        // ---------------------------------

        // CODE RÉEL (S'exécutera quand l'autorisation sera validée)
        const token = await getUberToken();
        const customerId = (process.env.UBER_CUSTOMER_ID || process.env.UBER_CLIENT_ID)?.trim();
        const baseUrl = (process.env.UBER_BASE_URL || "https://sandbox-api.uber.com/v1/delivery").trim();

        const response = await axios.post(
            `${baseUrl}/customers/${customerId}/delivery_quotes`,
            {
                pickup_address: process.env.RESTAURANT_ADDRESS,
                dropoff_address: address,
            },
            {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            fee: response.data.fee / 100,
            quoteId: response.data.id,
            estimatedArrival: response.data.estimated_arrival,
            currency: response.data.currency_code
        });

    } catch (error) {
        console.error("Erreur Uber Details:", error.response?.data || error.message);
        const errorMsg = error.response?.data?.message || "Impossible d'obtenir un devis Uber.";
        res.status(400).json({ details: errorMsg });
    }
};

module.exports = { getDeliveryEstimate };