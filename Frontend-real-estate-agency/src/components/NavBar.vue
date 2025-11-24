<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light px-3">
    <!-- Logo -->
     <router-link class="navbar-brand fw-bold" to="/"> AIgenZ</router-link>

    <!-- Hamburger -->
    <button 
      class="navbar-toggler" 
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navMenu"
      aria-controls="navMenu"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span class="navbar-toggler-icon"></span>
    </button>

    <!-- Menu -->
    <div class="collapse navbar-collapse justify-content-end" id="navMenu">
      <ul class="navbar-nav mb-2 mb-lg-0">
        <li class="nav-item">
          <router-link class="nav-link" to="/">Home</router-link>
        </li>

        <li class="nav-item">
          <router-link class="nav-link" to="/dataset">Data Set</router-link>
        </li>

        <li class="nav-item">
           <router-link class="nav-link" to="/aboutus">About Us</router-link>
        </li>

       <div class="ms-auto d-flex align-items-center">
      <button
        v-if="isLoggedIn"
        class="btn btn-outline-danger"
        @click="logout"
      >
        Logout
      </button>

      <router-link
        v-else
        to="/signedup"
        class="btn btn-primary"
      >
        Login
      </router-link>
    </div>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "vue-router";

const router = useRouter();
const isLoggedIn = ref(false);

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    isLoggedIn.value = !!user;
  });
});

const logout = async () => {
  await signOut(auth);
  router.push("/signedup");
};
</script>

<style scoped>
.navbar-brand {
  font-size: 1.4rem;
}
</style>