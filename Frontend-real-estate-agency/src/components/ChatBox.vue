<template>
  <div class="chat-container container">
     <!-- Content Config -->
    <div class="content-config">
      <select v-model="selectedModel">
        <option value="main">MAIN</option>
        <option value="n8n">n8n</option>
      </select>
      <select v-model="selectedLanguage">
        <option value="thai">Thai</option>
        <option value="english">English</option>
        <option value="chinese">Chinese</option>
      </select>
    </div>
     
    <!-- Chat history -->
    <div class="chat-history" ref="chatHistoryRef">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message-row"
        :class="msg.sender === 'You' ? 'user' : 'ai'"
      >
        <!-- Text message -->
        <div v-if="msg.type === 'text'" class="bubble">
          <span>{{ msg.content }}</span>
        </div>

        <!-- User image -->
        <div v-else-if="msg.type === 'image'" class="bubble user">
          <img :src="msg.content" class="user-image-preview" />
        </div>

        <!-- AI property grid -->
        <div v-else-if="msg.type === 'grid'" class="property-grid">
          <div
            v-for="(property, i) in msg.content"
            :key="i"
            class="property-card"
          >
            <img :src="property.Image_Url_1" class="property-img" />
            <div class="property-info">
              <h4>{{ property.Title }}</h4>
              <p class="price">{{ property.Price }} THB</p>
              <p class="location">{{ property.Location }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input area -->
    <div class="chat-input-area input-group">
      <!-- IMAGE PICKER -->
      <label class="img-btn">
        📎
        <input type="file" accept="image/*" hidden @change="onImageSelected" />
      </label>
      <input
        v-model="userInput"
        @keyup.enter="sendMessage"
        type="text"
        class="form-control"
        placeholder="Send a message..."
      />
      <button class="btn btn-primary" @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, defineModel, useId } from "vue";
import axios from "axios";
import { useChatStore } from "../stores/chatStore";

const selectedModel = ref("main"); 
const selectedLanguage = ref("thai"); 

interface ChatItem {
  sender: "You" | "AI";
  type: "text" | "image" | "grid";
  content: string | any[];
}

// Pinia store
const chat = useChatStore();
const messages = chat.messages as ChatItem[];

// Local input
const userInput = ref("");

// Reference to chat history for auto-scroll
const chatHistoryRef = ref<HTMLDivElement | null>(null);

// Scroll to bottom helper
function scrollToBottom() {
  nextTick(() => {
    if (chatHistoryRef.value) {
      chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
    }
  });
}

/*************************************************
 * USER SENDS NORMAL TEXT MESSAGE
 *************************************************/
async function sendMessage() {
  if (!userInput.value.trim()) return;

  // Add user text
  messages.push({ sender: "You", type: "text", content: userInput.value });
  scrollToBottom();

  const msgToSend = userInput.value;
  userInput.value = "";

  try {
    const res = await axios.post("http://localhost:3000/api/chat", {
      userId: chat.uid, 
      userQuery: msgToSend,
      language: selectedLanguage.value,
    });

    // AI text reply
    if (res.data.reply) {
      messages.push({ sender: "AI", type: "text", content: res.data.reply });
      scrollToBottom();
    }

    // AI property grid
    let properties = ''
    if(res.data.intent === 'buy') {
      properties = res.data.properties || res.data.replyimg
    }else {
      properties = res.data.properties
    }
    
    if (properties && Array.isArray(properties)) {
      messages.push({ sender: "AI", type: "grid", content: properties });
      scrollToBottom();
    }
  } catch (err) {
    messages.push({ sender: "AI", type: "text", content: "Error connecting to backend." });
    scrollToBottom();
  }
}

/*************************************************
 * USER SELECTS AN IMAGE → PREVIEW IN CHAT
 *************************************************/

async function onImageSelected(event: Event) {
  let intentHistory = null
  try {
    const res = await axios.post("http://localhost:3000/api/insertimg", {
      userId: chat.uid
    });
    intentHistory = res.data.intentHistory[0]
    
    // AI text reply
  } catch (err) {
    messages.push({ sender: "AI", type: "text", content: "Error connecting to backend." });
    scrollToBottom();
  }
  
    console.log(intentHistory)
  
  if (intentHistory === "sell" || intentHistory === "sellInprogress") {
     const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const CLOUD_NAME = "dt9lsfnnk";
  const PRESET = "properties"; // your unsigned preset

  // Show a temporary preview first
  const previewUrl = URL.createObjectURL(file);
 const tempMessage: ChatItem = {
  sender: "You",
  type: "image",
  content: previewUrl,
};
  messages.push(tempMessage);
  scrollToBottom();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", PRESET);
  let imageUrl = ""
  try {
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    const cloudUrl = res.data.secure_url;
 
    imageUrl = cloudUrl
    // Replace preview with the uploaded URL
    tempMessage.content = cloudUrl;

    scrollToBottom();
    
  } catch (err: any) {
    console.error("Cloudinary Upload Error:", err.response?.data || err);
    messages.push({
      sender: "AI",
      type: "text",
      content: "❌ Failed to upload image.",
    });
  }
   try {
    const res = await axios.post("http://localhost:3000/api/insertedimg", {
      userId: chat.uid,
      imgUrl: imageUrl
    });
    intentHistory = res.data.intentHistory[0]
    
    // AI text reply
  } catch (err) {
    console.log("The error from uploaded imgae:", err)
  }
  
  }else {
    alert("Please chat with us more!")
  }
}

</script>

<style scoped>
.chat-container {
  margin-top: 2rem;
  max-width: 920px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background: #f7f7f8;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.ai {
  justify-content: flex-start;
}

.bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 15px;
  line-height: 1.45;
  background: #e8eaed;
  color: #111;
}

.user .bubble {
  background: #007bff;
  color: white;
}

.chat-input-area {
  padding: 1rem;
  border-top: 1px solid #eee;
  background: white;
}

.property-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 15px;
  width: 100%;
  margin-top: 10px;
}

.property-card {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #ddd;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: 0.2s ease-in-out;
}

.property-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.property-img {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.property-info {
  padding: 10px;
}

.price {
  font-weight: bold;
  margin: 4px 0;
}

.location {
  color: #777;
  font-size: 14px;
}

.user-image-preview {
  max-width: 180px;
  border-radius: 12px;
}
.content-config button {
  margin-right: 10px; 
}
</style>
