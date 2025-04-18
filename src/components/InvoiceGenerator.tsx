import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import emailjs from "@emailjs/browser";

interface InvoiceProps {
  locataireNom: string;
  locataireEmail: string;
  adresseBien: string;
  montant: number;
  datePaiement: string;
}

export const generatePDF = (invoice: InvoiceProps) => {
  console.log("📄 Génération du PDF pour :", invoice);
  
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Facture de Loyer", 14, 20);

  doc.setFontSize(12);
  doc.text(`Locataire: ${invoice.locataireNom}`, 14, 30);
  doc.text(`Adresse du bien: ${invoice.adresseBien}`, 14, 40);
  doc.text(`Date du paiement: ${invoice.datePaiement}`, 14, 50);
  doc.text(`Montant payé: ${invoice.montant.toFixed(2)} €`, 14, 60);

  autoTable(doc, {
    startY: 70,
    head: [["Détails", "Valeur"]],
    body: [
      ["Locataire", invoice.locataireNom],
      ["Email", invoice.locataireEmail],
      ["Adresse du bien", invoice.adresseBien],
      ["Date de paiement", invoice.datePaiement],
      ["Montant", `${invoice.montant.toFixed(2)} €`],
    ],
  });

  const fileName = `Facture_${invoice.locataireNom.replace(" ", "_")}.pdf`;
  doc.save(fileName);
};

export const sendEmail = (invoice: InvoiceProps) => {
  const templateParams = {
    to_email: invoice.locataireEmail,
    locataire_nom: invoice.locataireNom,
    adresse_bien: invoice.adresseBien,
    montant: invoice.montant.toFixed(2),
    date_paiement: invoice.datePaiement,
  };

  console.log("📧 Envoi EmailJS avec :", templateParams);

  emailjs
    .send(
      "service_xxx", // Remplace par ton vrai Service ID
      "template_xxx", // Remplace par ton vrai Template ID
      templateParams,
      "user_xxx" // Remplace par ton vrai User ID
    )
    .then(
      (response) => {
        console.log("✅ Facture envoyée avec succès !", response.status, response.text);
      },
      (err) => {
        console.error("❌ Erreur lors de l'envoi de l'email", err);
      }
    );
};
