<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <transition name="fade" mode="out-in">
      <div
        v-if="step === 1 || step === 2"
        class="w-full max-w-md bg-white shadow-lg rounded-lg p-6"
      >
        <div v-if="step === 1" key="step-1">
          <h2 class="text-2xl font-semibold text-gray-700 text-center mb-4">
            Phone Verification
          </h2>
          <label for="phone" class="block text-gray-600 font-medium mb-2">Phone Number</label>
          <input
            v-model="phone"
            id="phone"
            type="text"
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Enter phone number"
          />
          <button
            @click="sendPhone"
            class="w-full mt-4 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-300 transform hover:scale-105"
          >
            Send Code
          </button>
        </div>
        <div v-if="step === 2" key="step-2">
          <h2 class="text-2xl font-semibold text-gray-700 text-center mb-4">
            Enter Verification Code
          </h2>
          <p class="text-gray-600 text-sm mb-4 text-center">
            Code sent to your phone. Please enter the code below:
          </p>
          <label for="code" class="block text-gray-600 font-medium mb-2">Verification Code</label>
          <input
            v-model="code"
            id="code"
            type="text"
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Enter verification code"
          />
          <button
            @click="submitCode"
            class="w-full mt-4 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition duration-300 transform hover:scale-105"
          >
            Submit Code
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  data() {
    return {
      phone: "",
      code: "",
      phoneCodeHash: "",
      step: 1,
      error: "",
      message: "",
    };
  },
  methods: {
    async sendPhone() {
      try {
        const response = await fetch("http://localhost:3010/telegram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: this.phone,
          }),
        });

        const data = await response.json();
        if (data.phoneCodeHash) {
          this.phoneCodeHash = data.phoneCodeHash;
          this.step = 2;
        } else {
          this.error = data.error || "Unknown error occurred";
        }
      } catch (err) {
        this.error = "Failed to send phone number.";
      }
    },

    async submitCode() {
      try {
        const response = await fetch("http://localhost:3010/telegram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: this.phone,
            code: this.code,
            phoneCodeHash: this.phoneCodeHash,
          }),
        });

        const data = await response.json();
        if (data.error) {
          this.error = data.error;
        } else {
          this.message = "Code verified successfully!";
        }
      } catch (err) {
        this.error = "Failed to submit code.";
      }
    },
  },
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
