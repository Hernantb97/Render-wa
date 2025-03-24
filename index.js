const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Endpoints
app.get('/bot-status', (req, res) => {
    res.json({
        isAuthenticated: true,
        isReady: true,
        timestamp: new Date().toISOString()
    });
});

app.post('/send-message', async (req, res) => {
    try {
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ error: 'Phone and message are required' });
        }

        // Configurar payload para Gupshup
        const gupshupPayload = {
            channel: "whatsapp",
            source: "+5212228557784",
            destination: phone,
            message: {
                type: "text",
                text: message
            },
            'src.name': "Hernán Tenorio"
        };

        // Enviar mensaje a Gupshup
        const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', gupshupPayload, {
            headers: {
                'Content-Type': 'application/json',
                'apikey': 'sk_8def1775845143bc8da6fbcfedb285c2'
            }
        });

        res.json({ success: true, message: 'Message sent successfully', data: response.data });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/restart-bot', async (req, res) => {
    res.json({ success: true, message: 'Bot restarted successfully' });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
}); 