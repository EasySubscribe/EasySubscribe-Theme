const getApiBaseUrl = (inc) => {
  const themeName = "easySubscribe";
  // Verifica se siamo in ambiente WordPress online, locale o PHP locale
  const isWordPressOnline = window.location.origin.includes("tuodominio.com"); // Modifica con il dominio online di WordPress
  const isWordPressLocal =
    window.location.origin.includes("localhost") && !window.location.port; // WordPress locale senza porta
  const isPhpLocal =
    window.location.origin.includes("localhost") &&
    window.location.port === "3000"; // PHP locale con porta 3000
  let pathname = ""; // Variabile di fallback
  try {
    const pathSegments = window.location.pathname.split("/");
    pathname = pathSegments.length > 1 ? `/${pathSegments[1]}/` : ""; // "/wpgiovanni/" oppure stringa vuota
  } catch (error) {
    console.error("Errore nell'estrazione del percorso:", error);
    pathname = window.location.pathname; // In caso di errore, usa il pathname completo
  }
  if (inc === "stripe")
    if (isWordPressOnline) {
      // Restituisce l'URL base in base all'ambiente
      // WordPress online (produzione)
      return `${window.location.origin}${pathname}wp-content/themes/${themeName}/inc/stripe/`;
    } else if (isWordPressLocal) {
      // WordPress locale (senza porta specifica)
      return `${window.location.origin}${pathname}wp-content/themes/${themeName}/inc/stripe/`;
    } else {
      // Ambiente non WordPress
      return "inc/stripe/";
    }
  else if (inc === "api")
    if (isWordPressOnline) {
      // Restituisce l'URL base in base all'ambiente
      // WordPress online (produzione)
      return `${window.location.origin}${pathname}wp-content/themes/${themeName}/inc/api/`;
    } else if (isWordPressLocal) {
      // WordPress locale (senza porta specifica) http://localhost/wpgiovanni/contact-me/wp-content/themes/easySubscribe/inc/api/contact-me.php
      return `${window.location.origin}${pathname}wp-content/themes/${themeName}/inc/api/`;
    } else {
      // Ambiente non WordPress
      return "../inc/api/";
    }
};

const formatDateIntl = (inputDate) => {
  const [day, month, year] = inputDate.split("/");
  const date = new Date(`${year}-${month}-${day}`);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

function getExpiredDate(element, fullDate, daysToRemove = 0) {
  let meta = element.product.metadata;

  if (meta) {
    let monthsToAdd = parseInt(element.product.metadata.durata_minima, 10); // Assicurati che sia un numero
    if (monthsToAdd != undefined || monthsToAdd != null) {
      const createdDate = new Date(element.subscriptions.created * 1000); // Timestamp in secondi
      const expirationDate = new Date(createdDate); // Crea una copia separata

      expirationDate.setMonth(expirationDate.getMonth() + monthsToAdd); // Aggiungi i mesi

      // Rimuovi i giorni se `daysToRemove` è definito e maggiore di 0
      if (daysToRemove > 0) {
        expirationDate.setDate(expirationDate.getDate() - daysToRemove);
      }

      // Restituisci il risultato in base a `fullDate`
      if (fullDate) return expirationDate;
      return expirationDate.toLocaleDateString();
    }
  }
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}
