<template>
  <div class="container mt-5" style="max-width: 400px;">
    <h3 class="text-center mb-4">Login</h3>

    <input
      v-model="email"
      class="form-control mb-2"
      type="email"
      placeholder="Email"
    />

    <input
      v-model="password"
      class="form-control mb-3"
      type="password"
      placeholder="Password"
    />

    <button class="btn btn-primary w-100" @click="login">
      Login
    </button>

    <button class="btn btn-outline-secondary w-100 mt-2" @click="register">
      Create Account
    </button>

    <p class="text-danger mt-3">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";

const email = ref("");
const password = ref("");
const error = ref("");

const login = async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value
    );

    error.value = "";
    alert("Logged in!");
  } catch (e) {
    error.value = e.message;
  }
};

const register = async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    );

    const uid = userCredential.user.uid;
    console.log("New User UID:", uid);

    // Save UID
    localStorage.setItem("uid", uid);

    error.value = "";
    alert("Account created!");
  } catch (e) {
    error.value = e.message;
  }
};
</script>
