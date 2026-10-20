const groomingFees = 50;
const numberOfPets = 2;
const gstRate = 0.09;

const subtotal = groomingFees * numberOfPets;
const gst = subtotal * gstRate;
const total = subtotal + gst;

const message = "The total cost is $" + total;
const msg = `The total cost is $${total}`;

console.log(message);
console.log(msg);