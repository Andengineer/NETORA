document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("#contacto form");

  form.addEventListener("submit", async function (e) {
    e.preventDefault(); // Evita el envío normal

    // Obtener valores
    const email = document.querySelector("#email").value.trim();
    const subject = document.querySelector("#subject").value.trim();
    const message = document.querySelector("#message").value.trim();

    // Validaciones
    if (!email || !subject || !message) {
      alert("Por favor completa todos los campos.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Por favor ingresa un correo válido.");
      return;
    }

    // Mostrar mensaje de cargando
    const button = form.querySelector("button");
    const originalText = button.innerText;
    button.innerText = "Enviando...";
    button.disabled = true;

    try {
      // Ejemplo usando Formspree (cambia la URL por la tuya)
      const response = await fetch("https://formspree.io/f/mdkdrzlv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, subject, message })
      });

      if (response.ok) {
        alert("✅ Mensaje enviado con éxito.");
        form.reset();
      } else {
        alert("❌ Ocurrió un error al enviar el mensaje.");
      }
    } catch (error) {
      console.error(error);
      alert("❌ Error de conexión.");
    }

    // Restaurar botón
    button.innerText = originalText;
    button.disabled = false;
  });
});
