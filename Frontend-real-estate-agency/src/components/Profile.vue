<template>
  <div class="container mt-5">
    <div class="card shadow-sm p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>Profile</h2>
        <button class="btn btn-outline-danger" @click="logout">Logout</button>
      </div>

      <div v-if="userInfo">

        <!-- USER INFO -->
        <div class="mb-3">
          <label class="form-label"><strong>UID:</strong></label>
          <p>{{ userStore.uid }}</p>
        </div>

        <!-- Editable Name -->
        <div class="mb-3 d-flex align-items-center gap-2">
          <label class="form-label mb-0"><strong>Name:</strong></label>

          <input type="text" class="form-control"
                 v-model="editableName"
                 :readonly="!isEditing" />

          <button v-if="!isEditing" class="btn btn-outline-primary" @click="startEditing">
            Edit
          </button>

          <button v-else class="btn btn-success"
                  :disabled="editableName === userInfo.name"
                  @click="updateName">
            Save
          </button>

          <button v-if="isEditing" class="btn btn-secondary" @click="cancelEditing">
            Cancel
          </button>
        </div>

        <!-- SELLING PROPERTY -->
        <h4 class="mt-4">Your Selling Property</h4>

        <div v-if="sellingProperty" class="property-card mt-3" @click="openModal(sellingProperty)">
          <img :src="sellingProperty.Image_Url_1 || fallback" class="property-img" />
          <div class="property-info">
            <h5>{{ sellingProperty.Title }}</h5>
            <p class="text-muted">{{ sellingProperty.Location }}</p>
            <p class="price">฿ {{ sellingProperty.Price?.toLocaleString() }}</p>
          </div>
        </div>

        <p v-else class="text-muted">No selling property assigned.</p>

        <!-- BUYING PROPERTY + APPOINTMENT -->
        <h4 class="mt-5">Your Buying Property & Appointment</h4>

        <!-- Appointment card -->
        <div class="appointment-card mt-3 p-3 shadow-sm rounded">
          <h5 class="mb-1">📅 Appointment</h5>
          <p class="text-muted" v-if="appointment">{{ appointment }}</p>
          <p class="text-muted" v-else>No appointment scheduled.</p>
        </div>

        <!-- Buying Property Card -->
        <div
          v-if="buyingPropertyData"
          class="property-card mt-3"
          @click="openModal(buyingPropertyData)"
        >
          <img :src="buyingPropertyData.Image_Url_1 || fallback" class="property-img" />
          <div class="property-info">
            <h5>{{ buyingPropertyData.Title }}</h5>
            <p class="text-muted">{{ buyingPropertyData.Location }}</p>
            <p class="price">฿ {{ buyingPropertyData.Price?.toLocaleString() }}</p>
          </div>
        </div>

        <p v-else class="text-muted mt-2">No buying property assigned.</p>

      </div>

      <div v-else class="text-center py-3">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    </div>

    <!-- PROPERTY MODAL -->
    <div class="modal fade" id="propertyModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">{{ selected.Title }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">

            <img :src="selected.Image_Url_1 || fallback" class="img-fluid rounded mb-3" />

            <p><strong>Description:</strong> {{ selected.Description }}</p>
            <p><strong>Bedrooms:</strong> {{ selected.Bed_room }}</p>
            <p><strong>Bathrooms:</strong> {{ selected.Bath_room }}</p>
            <p><strong>Size:</strong> {{ selected.Size }} sqm</p>
            <p><strong>Price:</strong> ฿ {{ selected.Price?.toLocaleString() }}</p>

          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "vue-router";
import { useUserStore } from "../stores/userStore";
import { supabase } from "../lib/supabase";
import * as bootstrap from "bootstrap";

const router = useRouter();
const userStore = useUserStore();

const userInfo = ref(null);
const editableName = ref("");
const isEditing = ref(false);

const sellingProperty = ref(null);
const buyingPropertyData = ref(null);

const selected = ref({});
const fallback = "/no-image.png";

const appointment = ref("");
const BuyingProperty = ref("");

// ------------------------------
// Fetch profile & related property
// ------------------------------
onMounted(async () => {
  if (!userStore.uid) return;

  try {
    const res = await axios.post("http://localhost:3000/api/loggedin", {
      id: userStore.uid,
    });

    userInfo.value = res.data.userInfo?.[0] || null;
    editableName.value = userInfo.value?.name || "";
    
    appointment.value = userInfo.value?.appointment;
    BuyingProperty.value = userInfo.value?.buying_property_id;

    // FETCH SELLING PROPERTY
    if (userInfo.value?.selling_property_id) {
      const { data } = await supabase
        .from("Properties")
        .select("*")
        .eq("Id", userInfo.value.selling_property_id)
        .maybeSingle();

      sellingProperty.value = data;
    }

    // FETCH BUYING PROPERTY
    if (userInfo.value?.buying_property_id) {
      const { data } = await supabase
        .from("Properties")
        .select("*")
        .eq("Id", userInfo.value.buying_property_id)
        .maybeSingle();

      buyingPropertyData.value = data;
    }

  } catch (err) {
    console.error("API Error:", err);
  }
});

// ------------------------------
// Modal
// ------------------------------
function openModal(property) {
  selected.value = property;
  const modal = new bootstrap.Modal(document.getElementById("propertyModal"));
  modal.show();
}

// ------------------------------
// Editable Name
// ------------------------------
const startEditing = () => (isEditing.value = true);

const cancelEditing = () => {
  editableName.value = userInfo.value.name;
  isEditing.value = false;
};

const updateName = async () => {
  try {
    if (!editableName.value || editableName.value === userInfo.value.name) return;

    await axios.post("http://localhost:3000/api/updateuser", {
      id: userInfo.value.user_id,
      name: editableName.value,
    });

    userInfo.value.name = editableName.value;
    isEditing.value = false;
  } catch (err) {
    console.error("Update Error:", err);
  }
};

// ------------------------------
// Logout
// ------------------------------
const logout = async () => {
  await signOut(auth);
  router.push("/signedup");
};
</script>

<style scoped>
.property-card {
  display: flex;
  gap: 16px;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.25s ease;
}

.property-card:hover {
  background: #f8f9fa;
  transform: translateY(-3px);
}

.property-img {
  width: 140px;
  height: 100px;
  object-fit: cover;
  border-radius: 10px;
}

.property-info {
  flex: 1;
}

.price {
  font-weight: bold;
  color: #0d6efd;
  font-size: 1.2rem;
}

.appointment-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  background: white;
}

input[readonly] {
  background-color: #f8f9fa;
  cursor: not-allowed;
}
</style>
