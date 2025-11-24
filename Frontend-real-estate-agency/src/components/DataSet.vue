<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase";
import * as bootstrap from 'bootstrap';

const dataRows = ref([]);
const selected = ref({}); // <-- Move it here, top level
const fallback = "/no-image.png";

onMounted(async () => {
  const { data, error } = await supabase
    .from('Properties')
    .select();

  if (error) {
    console.error(error);
    return;
  }

  console.log(data); // Test
  dataRows.value = data;
});

function openModal(property) {
  selected.value = property;

  const modal = new bootstrap.Modal(document.getElementById("propertyModal"));
  modal.show();
}
</script>


<template>
  <div class="container py-4">

    <h2 class="mb-4">Property Listings</h2>

    <div class="row g-4">
      <div class="col-md-4" v-for="property in dataRows" :key="property.Id">

        <!-- Property Card -->
        <div class="card h-100 shadow-sm property-card"
             @click="openModal(property)"
             style="cursor: pointer;">

          <!-- Image -->
          <img :src="property.Image_Url_1 || fallback"
               class="card-img-top" />

          <div class="card-body">
            <h5 class="card-title">{{ property.Title }}</h5>

            <p class="text-muted mb-1">
              <i class="bi bi-geo-alt"></i> {{ property.Location }}
            </p>

            <p class="price-tag">
              ฿ {{ property.Price.toLocaleString() }}
            </p>
          </div>
        </div>

      </div>
    </div>

    <!-- Bootstrap Modal -->
    <div class="modal fade" id="propertyModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">{{ selected.Title }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">

            <!-- Modal Image -->
            <img :src="selected.Image_Url_1 || fallback"
                 class="img-fluid rounded mb-3" />

            <p><strong>Description:</strong> {{ selected.Description }}</p>
            <p><strong>Bedrooms:</strong> {{ selected.Bed_room }}</p>
            <p><strong>Bathrooms:</strong> {{ selected.Bath_room }}</p>

          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">
              Close
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.property-card {
  border-radius: 12px;
  overflow: hidden;
  transition: 0.25s ease;
}

.property-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 18px rgba(0,0,0,0.15);
}

.card-img-top {
  height: 200px;
  object-fit: cover;
}

.price-tag {
  font-size: 1.2rem;
  font-weight: 600;
  color: #0d6efd;
}
</style>
