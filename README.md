# ⚡ PuterJS GUI

A modern, futuristic GUI for [Puter.js](https://puter.com) — featuring AI chat with 40+ models, 
cloud file management, downloads, key-value storage, and authentication.

## 🚀 Features

### 🤖 AI Chat
- **40+ AI Models**: GPT-4o, Claude 3.5, Gemini 2.0, Llama 3.3, Mistral, DeepSeek, Qwen, Grok & more
- **Model Search**: Fuzzy search across all providers
- **Stream Mode**: Real-time token streaming
- **System Prompts**: Customizable AI behavior
- **Conversation History**: Auto-saved to cloud
- **Export/Import**: Download chats as JSON or Markdown, import them back
- **Message Actions**: Copy, delete, regenerate from any point

### 📁 File Manager
- **Full CRUD**: Create, read, update, delete files & folders
- **List & Grid Views**: Toggle between view modes
- **Drag & Drop Upload**: Drop files anywhere to upload
- **Built-in Editor**: Edit text files directly in the browser
- **Search & Sort**: Filter by name, sort by size/date/type
- **File Type Icons**: 40+ file type icons

### ⬇️ Downloads
- **Download from Cloud**: Download any file by path
- **Batch Download**: Select multiple files at once
- **Chat Export**: Download conversations as JSON or Markdown
- **KV Data Export**: Export all key-value data as JSON
- **Download History**: Track all your downloads

### 🗄️ Key-Value Database
- **CRUD Operations**: Set, get, delete entries
- **Increment/Decrement**: Built-in counter support
- **JSON Support**: Store structured data
- **Bulk View**: See all entries in a table
- **Filter & Search**: Find entries quickly
- **Export**: Download all data as JSON

### 🔐 Authentication
- **Puter Sign In**: One-click cloud authentication
- **User Profile**: View account details
- **Session Management**: Check status, sign out

### 🎨 Design
- **Dark & Light Themes**: Toggle with one click
- **Glass Morphism**: Frosted glass card effects
- **Responsive**: Works on desktop, tablet, and mobile
- **Animations**: Smooth transitions throughout

## 📦 Setup

1. Create a new GitHub repository
2. Copy all files maintaining the folder structure
3. Enable GitHub Pages (Settings → Pages → main branch)
4. Visit `https://yourusername.github.io/repo-name`

## 🔧 File Structure
├── index.html # Dashboard
├── chat.html # AI Chat
├── files.html # File Manager
├── downloads.html # Downloads
├── kv.html # Key-Value Store
├── auth.html # Authentication
├── css/
│ ├── main.css # Core layout & theme
│ ├── components.css # Reusable components
│ ├── chat.css # Chat-specific styles
│ └── files.css # File manager styles
├── js/
│ ├── utils.js # Shared utilities
│ ├── models.js # All AI models registry
│ ├── app.js # Dashboard logic
│ ├── chat.js # Chat logic
│ ├── files.js # File manager logic
│ ├── downloads.js # Downloads logic
│ ├── kv.js # Key-value store logic
│ └── auth.js # Authentication logic
└── README.md


## 🤖 Supported AI Models (40+)

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo, O1 Mini, O3 Mini |
| Anthropic | Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus, Claude 3 Sonnet/Haiku |
| Google | Gemini 2.0 Flash, Gemini 1.5 Pro/Flash, Gemma 2 27B/9B/2B |
| Meta | Llama 3.3 70B, Llama 3.1 405B/70B/8B, Llama 3 70B/8B |
| Mistral | Large 2, Medium, Small, Nemo, 7B, Mixtral 8x7B/8x22B, Codestral, Pixtral |
| DeepSeek | Chat, Reasoner (R1) |
| Qwen | 2.5 72B, 2.5 Coder 32B, QwQ 32B |
| xAI | Grok 2, Grok Beta |
| Other | Nous Hermes 2, WizardLM 2, DBRX, Command R/R+, Phi-3 |

## ⚡ No Backend Required

Everything runs client-side using Puter.js. No server, no API keys, no configuration needed.

## 📄 License

MIT — Use freely for any purpose.
🚀 How to Deploy
Create a GitHub repo named something like puter-platform
Create the folder structure and add all files above
Go to Settings → Pages → Deploy from main branch
Access at: https://yourusername.github.io/PuterJS-GUI
The entire platform runs client-side with no backend needed — Puter.js handles cloud storage, AI, auth, and KV storage directly from the browser.