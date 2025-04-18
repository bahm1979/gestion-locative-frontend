import { useState } from "react";
import jsPDF from "jspdf";
import { toast } from "react-toastify";
import { Paiement, Depense } from "./types";

interface ComptabiliteProps {
  paiements: Paiement[];
  depenses: Depense[];
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<any>;
  setDepenses: (depenses: Depense[]) => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("fr-FR");
};

const formatNumber = (value: number) => {
  const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} GNF`;
};

const Comptabilite = ({ paiements, depenses, fetchWithAuth, setDepenses }: ComptabiliteProps) => {
  const [formData, setFormData] = useState({
    type: "",
    montant: "",
    date_emission: "",
    description: "",
  });
  const [paymentDates, setPaymentDates] = useState<{ [key: number]: string }>({});

  const totalRevenus = paiements
    .filter((p) => p.est_paye)
    .reduce((acc, p) => acc + (typeof p.montant === "number" ? p.montant : 0), 0);
  const totalDepenses = depenses
    .filter((d) => d.statut === "payee")
    .reduce((acc, d) => acc + (typeof d.montant === "number" ? d.montant : 0), 0);
  const bilan = totalRevenus - totalDepenses;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetchWithAuth("http://localhost:3001/depenses", {
        method: "POST",
        body: JSON.stringify({
          type: formData.type,
          montant: parseFloat(formData.montant),
          date_emission: formData.date_emission,
          description: formData.description || null,
        }),
      });
      setDepenses([...depenses, response]);
      setFormData({ type: "", montant: "", date_emission: "", description: "" });
      toast.success("Dépense ajoutée avec succès");
    } catch (err) {
      console.error("Erreur lors de l’ajout de la dépense:", err);
      toast.error("Erreur lors de l’ajout de la dépense");
    }
  };

  const handlePayer = async (id: number) => {
    const date_paiement = paymentDates[id] || new Date().toISOString().split("T")[0];
    try {
      await fetchWithAuth(`http://localhost:3001/depenses/${id}/payer`, {
        method: "PUT",
        body: JSON.stringify({ date_paiement }),
      });
      setDepenses(
        depenses.map((d) =>
          d.id === id ? { ...d, statut: "payee", date_paiement } : d
        )
      );
      setPaymentDates((prev) => {
        const newDates = { ...prev };
        delete newDates[id];
        return newDates;
      });
      toast.success("Dépense marquée comme payée");
    } catch (err) {
      console.error("Erreur lors du paiement:", err);
      toast.error("Erreur lors du paiement");
    }
  };

  const handleSupprimer = async (id: number) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette dépense ?")) {
      try {
        await fetchWithAuth(`http://localhost:3001/depenses/${id}`, { method: "DELETE" });
        setDepenses(depenses.filter((d) => d.id !== id));
        toast.success("Dépense supprimée");
      } catch (err) {
        console.error("Erreur lors de la suppression:", err);
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 10;

    doc.setFontSize(16);
    doc.text("Rapport Comptable", 10, y);
    y += 15;

    doc.setFontSize(12);
    doc.text(`Revenus totaux: ${formatNumber(totalRevenus)}`, 10, y);
    y += 10;
    doc.text(`Dépenses totales: ${formatNumber(totalDepenses)}`, 10, y);
    y += 10;
    doc.text(`Bilan net: ${formatNumber(bilan)}`, 10, y);
    y += 15;

    doc.text("Dépenses récentes :", 10, y);
    y += 10;
    depenses.slice(0, 10).forEach((d) => {
      if (y > 270) {
        doc.addPage();
        y = 10;
      }
      const description = d.fournisseur_nom
        ? `${d.type} - ${d.fournisseur_nom} (${d.immeuble_nom || "N/A"})`
        : `${d.type} - ${d.description || "Sans description"}`;
      doc.text(`- ${description}: ${formatNumber(d.montant)} (${formatDate(d.date_emission)})`, 15, y);
      y += 7;
    });

    doc.save(`Rapport_Comptable_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.pdf`);
    toast.success("Rapport exporté en PDF");
  };

  return (
    <div className="comptabilite">
      <h2>Comptabilité</h2>

      {/* Résumé */}
      <div className="bilan-section">
        <h3>Résumé Financier</h3>
        <p>Revenus totaux: {formatNumber(totalRevenus)}</p>
        <p>Dépenses totales: {formatNumber(totalDepenses)}</p>
        <p>Bilan net: {formatNumber(bilan)}</p>
        <button onClick={exportToPDF} className="export-btn">
          <i className="fas fa-file-pdf"></i> Exporter en PDF
        </button>
      </div>

      {/* Formulaire d’ajout */}
      <div className="form-section">
        <h3>Ajouter une Dépense</h3>
        <form onSubmit={handleSubmit}>
          <select name="type" value={formData.type} onChange={handleInputChange} required>
            <option value="">Type de dépense</option>
            <option value="fournisseur">Fournisseur</option>
            <option value="taxes">Taxes</option>
            <option value="entretien">Entretien</option>
            <option value="autre">Autre</option>
          </select>
          <input
            type="number"
            name="montant"
            value={formData.montant}
            onChange={handleInputChange}
            placeholder="Montant (GNF)"
            required
          />
          <input
            type="date"
            name="date_emission"
            value={formData.date_emission}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Description (optionnel)"
          />
          <button type="submit">Ajouter</button>
        </form>
      </div>

      {/* Liste des dépenses */}
      <div className="depenses-section">
        <h3>Dépenses</h3>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>Montant</th>
              <th>Date Émission</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {depenses.map((d) => (
              <tr key={d.id}>
                <td>{d.type}</td>
                <td>
                  {d.fournisseur_nom
                    ? `${d.fournisseur_nom} (${d.immeuble_nom || "N/A"})`
                    : d.description || "Sans description"}
                </td>
                <td>{formatNumber(d.montant)}</td>
                <td>{formatDate(d.date_emission)}</td>
                <td>{d.statut === "payee" ? "Payée" : "Non payée"}</td>
                <td>
                  {d.statut === "non_payee" && (
                    <>
                      <input
                        type="date"
                        value={paymentDates[d.id] || ""}
                        onChange={(e) => setPaymentDates({ ...paymentDates, [d.id]: e.target.value })}
                      />
                      <button onClick={() => handlePayer(d.id)}>Payer</button>
                    </>
                  )}
                  <button onClick={() => handleSupprimer(d.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Comptabilite;