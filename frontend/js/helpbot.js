/**
 * ECoR-OAMS · Help Bot (CR-2026-006)
 * Rule-based FAQ chatbot with keyword matching.
 * Replaces the "AI Assistant (Coming Soon)" placeholder.
 */

// ═══════════════════════════════════════════════════════════
//  FAQ RULES
// ═══════════════════════════════════════════════════════════

const FAQ_RULES = [
    {
        keywords: ["transfer", "move"],
        reply: "To transfer an asset, go to the Asset Detail page, click 'Initiate Transfer', select the new room, and assign the new Custodian ID. The receiving Custodian must acknowledge it to complete the transfer.",
    },
    {
        keywords: ["pl number", "pl"],
        reply: "A PL (Price List) Number is an 8-digit unique classification code used by Indian Railways. You can find it on the GeM invoice.",
    },
    {
        keywords: ["condemn", "scrap"],
        reply: "Only an Auditor can mark an asset for removal. An asset is usually eligible if its repair costs exceed 50% of its purchase value.",
    },
    {
        keywords: ["depreciation", "book value"],
        reply: "ECoR-OAMS calculates Straight-Line Depreciation over 5 years (residual value = ₹0). You can view the depreciation schedule on the Assets page under the 'Depreciation' tab.",
    },
    {
        keywords: ["warranty", "amc"],
        reply: "Warranty and AMC expiry alerts appear on the Dashboard when an item is within 60 days of expiration. IT equipment warranty dates are tracked under IT Details.",
    },
    {
        keywords: ["role", "permission", "access"],
        reply: "There are three roles: Custodian (create/edit/transfer assets), IT Admin (all + MAC/IP fields), and Auditor (read-only + review/priority tagging). Each role has specific field-level access controls.",
    },
    {
        keywords: ["bundle", "desktop", "cpu monitor"],
        reply: "A Desktop Bundle links a CPU and Monitor as separate assets via a shared GeM Invoice Reference. Use the '+ Desktop Bundle' button on the Assets page to create one.",
    },
];

const FALLBACK_RESPONSE = "I'm sorry, I don't have the answer for that yet. Please click 'Report System Issue' in the main menu to contact the IT Cell.";

const WELCOME_MESSAGE = "👋 Hello! I'm the ECoR-OAMS Help Bot. Ask me about asset transfers, PL numbers, condemnation, depreciation, warranties, roles, or bundles. How can I help you today?";


// ═══════════════════════════════════════════════════════════
//  KEYWORD MATCHING
// ═══════════════════════════════════════════════════════════

function matchFAQ(input) {
    const lower = input.toLowerCase().trim();
    if (!lower) return FALLBACK_RESPONSE;

    for (const rule of FAQ_RULES) {
        for (const keyword of rule.keywords) {
            if (lower.includes(keyword.toLowerCase())) {
                return rule.reply;
            }
        }
    }

    return FALLBACK_RESPONSE;
}


// ═══════════════════════════════════════════════════════════
//  HELP BOT UI CONTROLLER
// ═══════════════════════════════════════════════════════════

const HelpBot = {
    /**
     * Initialize the Help Bot on a container element.
     * @param {string} messagesSelector - CSS selector for the messages container.
     * @param {string} inputSelector    - CSS selector for the text input.
     * @param {string} sendSelector     - CSS selector for the send button.
     */
    init(messagesSelector, inputSelector, sendSelector) {
        this.messagesEl = document.querySelector(messagesSelector);
        this.inputEl = document.querySelector(inputSelector);
        this.sendBtn = document.querySelector(sendSelector);

        if (!this.messagesEl || !this.inputEl || !this.sendBtn) return;

        // Send on button click
        this.sendBtn.addEventListener('click', () => this.handleSend());

        // Send on Enter key
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Show welcome message
        this.addMessage('bot', WELCOME_MESSAGE);
    },

    handleSend() {
        const text = this.inputEl.value.trim();
        if (!text) return;

        // Add user message
        this.addMessage('user', text);
        this.inputEl.value = '';

        // Simulate brief "thinking" delay
        setTimeout(() => {
            const reply = matchFAQ(text);
            this.addMessage('bot', reply);
        }, 400);
    },

    addMessage(type, text) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        });

        const sender = type === 'bot' ? '🤖 Help Bot' : '👤 You';

        const msgEl = document.createElement('div');
        msgEl.className = `helpbot-message ${type}`;
        msgEl.innerHTML = `
            <div class="msg-sender">${sender}</div>
            <div class="msg-text">${this._escapeHtml(text)}</div>
            <div class="msg-time">${timeStr}</div>
        `;

        this.messagesEl.appendChild(msgEl);

        // Auto-scroll to bottom
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    },

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
};
