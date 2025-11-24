// chatStore.js
import { defineStore } from "pinia";
import { ref } from "vue";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export const useChatStore = defineStore("chatStore", () => {
  const uid = ref(null);

  // Correct: update .value, not the whole ref
  onAuthStateChanged(auth, (user) => {
    uid.value = user ? user.uid : null;
    console.log("Firebase Auth UID:", uid.value);
  });

  const messages = ref([]);
  const messagesImg = ref([]);

  function addUserMessage(text) {
    messages.value.push({ sender: "You", text });
  }

  function addAIMessage(text) {
    messages.value.push({ sender: "AI", text });
  }

  function addProperties(properties) {
    messagesImg.value.push({ text: properties });
  }

  return {
    uid,
    messages,
    messagesImg,
    addUserMessage,
    addAIMessage,
    addProperties,
  };
});
