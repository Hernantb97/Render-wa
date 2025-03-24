import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        default: 'text'
    },
    metadata: {
        type: Object,
        default: {}
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'failed'],
        default: 'sent'
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    source: {
        type: String,
        enum: ['dashboard', 'whatsapp'],
        default: 'dashboard'
    }
});

export const Message = mongoose.model('Message', messageSchema); 