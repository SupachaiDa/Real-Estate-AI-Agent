import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state: () => ({
    uid: null,
  }),
  actions: {
    setUid(uid) {
      this.uid = uid;
    },
  },
});
