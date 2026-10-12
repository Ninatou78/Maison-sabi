// =========================================================
// SETTINGS: change these in ONE place
// =========================================================

// Digits only: country code first, no "+" and no spaces.
// WhatsApp links AND the "Call us" link both use this number.
// While testing you can put your own number here, but replace it
// with a placeholder BEFORE you push to GitHub or publish the site.
const BUSINESS_NUMBER = "905550000000";

const DEFAULT_MESSAGE = "Hello Maison Sabi, I'd like to place an order.";
const DELIVERY_FEE = 50;
const MINIMUM_DELIVERY_ORDER = 400;


// =========================================================
// STATE AND PAGE ELEMENTS
// =========================================================

const order = [];
let deliveryMethod = "pickup";

const orderList = document.querySelector("#order-list");
const orderTotal = document.querySelector(".order-total strong");
const deliveryMessage = document.querySelector("#delivery-message");
const orderOptions = document.querySelectorAll(".order-option");
const deliveryFields = document.querySelector(".delivery-fields");
const addressInput = document.querySelector("#address");

const orderForm = document.querySelector("#order-form");
const orderError = document.querySelector("#order-error");
const confirmation = document.querySelector("#order-confirmation");
const confirmationLink = document.querySelector("#order-whatsapp-link");
const newOrderButton = document.querySelector("#new-order-button");

const cateringForm = document.querySelector("#catering-form");
const cateringStatus = document.querySelector("#catering-status");


// =========================================================
// HELPERS
// =========================================================

// Format prices in Turkish lira.
function formatPrice(price) {
  return `₺${price}`;
}

// Build a WhatsApp link that opens a chat with our message already typed.
// encodeURIComponent makes spaces, line breaks and symbols safe for a URL.
function whatsappLink(message) {
  return `https://wa.me/${BUSINESS_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Work out the money in one place, so the screen and the
// WhatsApp message always show the same numbers.
function getTotals() {
  const subtotal = order.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const deliveryFee =
    deliveryMethod === "delivery" && order.length > 0 ? DELIVERY_FEE : 0;

  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}


// =========================================================
// WHATSAPP AND PHONE LINKS
// (HTML links marked data-whatsapp / data-phone are filled in here)
// =========================================================

document.querySelectorAll("[data-whatsapp]").forEach(link => {
  link.href = whatsappLink(DEFAULT_MESSAGE);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
});

document.querySelectorAll("[data-phone]").forEach(link => {
  link.href = `tel:+${BUSINESS_NUMBER}`;
});


// =========================================================
// ORDER DISPLAY
// =========================================================

// Display the customer's order.
function renderOrder() {
  const { subtotal, total } = getTotals();

  if (order.length === 0) {
    orderList.innerHTML =
      "<p>Your order is empty. Add something delicious!</p>";
  } else {
    orderList.innerHTML = order.map(item => `
      <div class="order-item">
        <div>
          <strong>${item.name}</strong>
          <p>${formatPrice(item.price)} × ${item.quantity}</p>
        </div>

        <div class="quantity-controls">
          <button type="button" data-action="decrease" data-id="${item.id}">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-action="increase" data-id="${item.id}">+</button>
          <button type="button" data-action="remove" data-id="${item.id}">Remove</button>
        </div>
      </div>
    `).join("");
  }

  orderTotal.textContent = formatPrice(total);

  // Delivery needs a minimum order. (The message also clears when the order is empty.)
  if (
    order.length > 0 &&
    deliveryMethod === "delivery" &&
    subtotal < MINIMUM_DELIVERY_ORDER
  ) {
    const amountNeeded = MINIMUM_DELIVERY_ORDER - subtotal;

    deliveryMessage.textContent =
      `Add ₺${amountNeeded} more in food to qualify for delivery (₺${MINIMUM_DELIVERY_ORDER} minimum).`;
  } else {
    deliveryMessage.textContent = "";
  }
}


// =========================================================
// ADDING AND CHANGING ITEMS
// =========================================================

// Listen for clicks on all menu buttons.
document.querySelectorAll(".add-button").forEach((button, index) => {
  button.addEventListener("click", () => {
    const card = button.closest(".menu-item");

    if (!card) return;

    const name = card.querySelector("h4").textContent.trim();

    const priceText = card.querySelector(".menu-item-top span").textContent;
    const price = Number(priceText.replace(/[^\d]/g, ""));

    // Use the name to find an existing item.
    let item = order.find(item => item.name === name);

    if (item) {
      item.quantity++;
    } else {
      order.push({
        id: index,
        name: name,
        price: price,
        quantity: 1
      });
    }

    renderOrder();
  });
});

// Handle quantity changes and item removal.
orderList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = Number(button.dataset.id);
  const item = order.find(item => item.id === id);

  if (!item) return;

  if (button.dataset.action === "increase") {
    item.quantity++;
  } else if (button.dataset.action === "decrease") {
    item.quantity--;

    if (item.quantity <= 0) {
      const index = order.indexOf(item);
      order.splice(index, 1);
    }
  } else if (button.dataset.action === "remove") {
    const index = order.indexOf(item);
    order.splice(index, 1);
  }

  renderOrder();
});


// =========================================================
// PICKUP OR DELIVERY
// =========================================================

// Show the delivery fields only for delivery, and make the
// address required only when it is needed.
function updateDeliveryFields() {
  const isDelivery = deliveryMethod === "delivery";

  deliveryFields.hidden = !isDelivery;
  addressInput.required = isDelivery;
}

function setDeliveryMethod(method) {
  deliveryMethod = method;

  orderOptions.forEach(option => {
    const optionMethod = option
      .querySelector("strong")
      .textContent.trim()
      .toLowerCase();

    option.classList.toggle("active", optionMethod === method);
  });

  updateDeliveryFields();
  renderOrder();
}

orderOptions.forEach(button => {
  button.addEventListener("click", () => {
    const selectedOption = button
      .querySelector("strong")
      .textContent.trim()
      .toLowerCase();

    setDeliveryMethod(selectedOption);
  });
});


// =========================================================
// SENDING THE ORDER ON WHATSAPP
// =========================================================

// Write the whole order as a readable WhatsApp message.
function buildOrderMessage() {
  const { subtotal, deliveryFee, total } = getTotals();
  const isDelivery = deliveryMethod === "delivery";

  const timeSelect = orderForm.querySelector("#order-time");
  const timeText = timeSelect.selectedOptions[0].textContent.trim();

  const payment = orderForm.querySelector('input[name="payment"]:checked').value;
  const paymentText =
    (payment === "card" ? "Card" : "Cash") +
    (isDelivery ? " on delivery" : " on pickup");

  const lines = [DEFAULT_MESSAGE, "", "ORDER"];

  order.forEach(item => {
    lines.push(
      `- ${item.quantity} × ${item.name} (${formatPrice(item.price * item.quantity)})`
    );
  });

  lines.push("", `Subtotal: ${formatPrice(subtotal)}`);

  if (isDelivery) {
    lines.push(`Delivery fee: ${formatPrice(deliveryFee)}`);
  }

  lines.push(`Total: ${formatPrice(total)}`, "");
  lines.push(`Type: ${isDelivery ? "Delivery in Kadıköy" : "Pickup"}`);

  if (isDelivery) {
    lines.push(`Address: ${orderForm.querySelector("#address").value.trim()}`);

    const building = orderForm.querySelector("#building").value.trim();
    if (building) lines.push(`Building / floor: ${building}`);
  }

  lines.push(`When: ${timeText}`);
  lines.push(`Payment: ${paymentText}`);

  const notes = orderForm.querySelector("#order-notes").value.trim();
  if (notes) lines.push(`Notes / allergies: ${notes}`);

  lines.push(
    "",
    `Name: ${orderForm.querySelector("#customer-name").value.trim()}`,
    `Phone: ${orderForm.querySelector("#customer-phone").value.trim()}`
  );

  return lines.join("\n");
}

// The browser already checks the required fields before this runs.
orderForm.addEventListener("submit", event => {
  event.preventDefault();
  orderError.textContent = "";

  if (order.length === 0) {
    orderError.textContent =
      "Your order is empty. Add at least one dish from the menu.";
    return;
  }

  const { subtotal } = getTotals();

  if (deliveryMethod === "delivery" && subtotal < MINIMUM_DELIVERY_ORDER) {
    orderError.textContent =
      `Delivery needs at least ₺${MINIMUM_DELIVERY_ORDER} in food. ` +
      `Add ₺${MINIMUM_DELIVERY_ORDER - subtotal} more or choose pickup.`;
    return;
  }

  const url = whatsappLink(buildOrderMessage());

  window.open(url, "_blank", "noopener");

  // If a popup blocker stops WhatsApp, this link still works.
  confirmationLink.href = url;
  confirmation.hidden = false;
  confirmation.scrollIntoView({ behavior: "smooth", block: "center" });
});

// Start over after an order has been sent.
newOrderButton.addEventListener("click", () => {
  order.length = 0;
  orderForm.reset();
  orderError.textContent = "";
  confirmation.hidden = true;
  setDeliveryMethod("pickup");
});


// =========================================================
// CATERING FORM (sent through Formspree)
// =========================================================

// People can't pick a date in the past.
const eventDate = document.querySelector("#event-date");
eventDate.min = new Date().toISOString().split("T")[0];

function showCateringStatus(message, type) {
  cateringStatus.textContent = message;
  cateringStatus.className = `form-status ${type}`;
}

cateringForm.addEventListener("submit", async event => {
  event.preventDefault();

  // Reminder for you, the developer: the form is not connected yet.
  if (cateringForm.action.includes("YOUR_FORM_ID")) {
    showCateringStatus(
      "This form is not connected yet. Add your Formspree form ID in index.html.",
      "error"
    );
    return;
  }

  const submitButton = cateringForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showCateringStatus("Sending...", "");

  try {
    const response = await fetch(cateringForm.action, {
      method: "POST",
      body: new FormData(cateringForm),
      headers: { Accept: "application/json" }
    });

    if (response.ok) {
      cateringForm.reset();
      showCateringStatus(
        "Thank you! We received your inquiry and will contact you soon.",
        "success"
      );
    } else {
      showCateringStatus(
        "Something went wrong. Please try again or message us on WhatsApp.",
        "error"
      );
    }
  } catch (error) {
    showCateringStatus(
      "We couldn't send your inquiry. Check your connection and try again.",
      "error"
    );
  }

  submitButton.disabled = false;
});


// =========================================================
// WHEN THE PAGE FIRST LOADS
// =========================================================

updateDeliveryFields();
renderOrder();