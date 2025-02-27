const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  loader.style.visibility = "hidden";
  // Riferimenti agli input
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const submitButton = document.getElementById("submitContactEmailBtn");
  const phoneNumberInput = document.getElementById("phone");
  const descriptionInput = document.getElementById("description");

  // Espressioni regolari per validare email e numero di telefono
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex base per l'email
  const phoneRegex =
    /^\+?\d{1,4}[\s\-]?\(?\d{1,3}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/; // Regex per numero di telefono con spazi opzionali

  // Funzione per controllare se tutti i campi sono validi
  const validateForm = () => {
    const isNameValid = nameInput.value.trim() !== "";
    const isEmailValid = emailRegex.test(emailInput.value);
    const isPhoneValid = phoneRegex.test(phoneNumberInput.value);
    const isDescriptionValid = descriptionInput.value.trim() !== "";

    // Abilita o disabilita il bottone in base alla validità dei campi
    submitButton.disabled = !(
      isNameValid &&
      isEmailValid &&
      isPhoneValid &&
      isDescriptionValid
    );
  };

  // Aggiungi listener per ogni campo per aggiornare lo stato del bottone
  nameInput.addEventListener("input", validateForm);
  emailInput.addEventListener("input", validateForm);
  phoneNumberInput.addEventListener("input", validateForm);
  descriptionInput.addEventListener("input", validateForm);

  // Verifica lo stato iniziale del form al caricamento
  validateForm();
});

async function handleSubmit(event) {
  event.preventDefault();
  const nameInput = document.getElementById("name"); // Riferimento all'input
  const emailInput = document.getElementById("email"); // Riferimento all'input
  const phoneNumberInput = document.getElementById("phone"); // Riferimento all'input
  const descriptionInput = document.getElementById("description"); // Riferimento all'input
  const email = emailInput.value; // Ottieni il valore dell'input

  const loader = document.getElementById("loader");
  loader.style.visibility = "visible";

  const isValidEmail = emailRegex.test(email);

  const requestBody = {
    name: nameInput.value,
    email: email,
    phone: phoneNumberInput.value,
    description: descriptionInput.value,
  };

  const apiUrl = getApiBaseUrl("api");

  if (isValidEmail) {
    try {
      //const response = await fetch("../inc/api/contact-me.php", {
      const response = await fetch(apiUrl + "contact-me.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      loader.style.visibility = "hidden";
      if (!data.error) {
        simpleDialog(
          translations.contact_me_sent_email_title,
          translations.contact_me_sent_email_text
        );
        emailInput.value = ""; // Svuota l'input dell'email
      } else {
        errorDialog(translations.generic_error_title, error.message);
      }
    } catch (error) {
      loader.style.visibility = "hidden";
      errorDialog(
        translations.network_error_title,
        translations.network_error_text
      );
    }
  } else {
    errorDialog(
      translations.invalid_email_title,
      translations.invalid_email_text
    );
  }
}
