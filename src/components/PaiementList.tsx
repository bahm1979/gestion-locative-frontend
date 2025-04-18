import { useState, FormEvent } from "react";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import { Appartement, Locataire, Contrat, Paiement } from "./types";

interface PaiementListProps {
  paiements: Paiement[];
  locataires: Locataire[];
  appartements: Appartement[];
  contrats: Contrat[];
  onAdd: (paiement: Paiement) => void;
  onUpdate: (paiement: Paiement) => void;
  fetchWithAuth: <T>(url: string, options?: RequestInit) => Promise<T | undefined>;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatMontant = (montant: number | undefined, monnaie: string) => {
  if (montant === undefined || montant === null) return `0 ${monnaie}`;
  try {
    return montant.toLocaleString("fr-FR") + " " + monnaie;
  } catch (err) {
    return `${montant.toFixed(2)} ${monnaie}`;
  }
};

const formatMontantPDF = (montant: number | undefined, monnaie: string) => {
  if (montant === undefined || montant === null) return `0.00 ${monnaie}`;
  const formatted = montant.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} ${monnaie}`;
};

export default function PaiementList({
  paiements,
  locataires,
  appartements,
  contrats,
  onAdd,
  onUpdate,
  fetchWithAuth,
}: PaiementListProps) {
  const [contratId, setContratId] = useState<number | "">("");
  const [montant, setMontant] = useState("");
  const [datePaiement, setDatePaiement] = useState("");
  const [estPaye, setEstPaye] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (contratId === "" || !montant || !datePaiement) {
      setError("Tous les champs obligatoires sont requis !");
      setIsLoading(false);
      return;
    }

    const parsedMontant = parseFloat(montant);
    if (isNaN(parsedMontant) || parsedMontant <= 0) {
      setError("Le montant doit être un nombre positif !");
      setIsLoading(false);
      return;
    }

    const contrat = contrats.find((c) => c.id === Number(contratId));
    if (!contrat) {
      setError("Contrat sélectionné invalide !");
      setIsLoading(false);
      return;
    }

    const newPaiement: Paiement = {
      id: 0,
      contrat_id: Number(contratId),
      montant: parsedMontant,
      date_paiement: datePaiement,
      est_paye: estPaye,
    };

    try {
      const savedPaiement = await fetchWithAuth<Paiement>(
        `http://localhost:3001/paiements`,
        {
          method: "POST",
          body: JSON.stringify(newPaiement),
        }
      );
      if (savedPaiement) {
        onAdd(savedPaiement);
        toast.success("Paiement ajouté et email envoyé");
        setContratId("");
        setMontant("");
        setDatePaiement("");
        setEstPaye(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePaye = async (paiement: Paiement) => {
    setError(null);
    setIsLoading(true);

    const updatedPaiement = { ...paiement, est_paye: !paiement.est_paye };

    try {
      const result = await fetchWithAuth<Paiement>(
        `http://localhost:3001/paiements/${paiement.id}`,
        {
          method: "PUT",
          body: JSON.stringify(updatedPaiement),
        }
      );
      if (result) {
        onUpdate(result);
        toast.success(`Paiement marqué comme ${result.est_paye ? "payé" : "impayé"} et email envoyé`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de la mise à jour";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const exportFacturePDF = (paiement: Paiement) => {
    try {
      const doc = new jsPDF();
      const contrat = contrats.find((c) => c.id === paiement.contrat_id);
      const appartement = appartements.find((a) => a.id === contrat?.appartement_id);
      const locataire = locataires.find((l) => l.id === contrat?.locataire_id);
      const monnaie = appartement ? "GNF" : "EUR";

      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      doc.text("Facture de Paiement", 10, 10);

      doc.setFontSize(12);
      doc.text(`Appartement: ${appartement?.numero || "Inconnu"}`, 10, 30);
      doc.text(`Locataire: ${locataire?.nom || "Inconnu"}`, 10, 40);
      doc.text(`Montant: ${formatMontantPDF(paiement.montant, monnaie)}`, 10, 50);
      doc.text(`Date de paiement: ${formatDate(paiement.date_paiement)}`, 10, 60);
      doc.text(`Statut: ${paiement.est_paye ? "Payé" : "Impayé"}`, 10, 70);
      doc.text(`Caution: ${contrat ? formatMontantPDF(contrat.caution, monnaie) : "N/A"}`, 10, 80);

      doc.text("Détails supplémentaires :", 10, 100);
      doc.text(`- Contrat ID: ${paiement.contrat_id}`, 10, 110);
      doc.text(
        `- Loyer mensuel attendu: ${contrat ? formatMontantPDF(contrat.loyer_mensuel, monnaie) : "N/A"}`,
        10,
        120
      );

      doc.save(`Facture_Paiement_${locataire?.nom || "Inconnu"}_${paiement.id}.pdf`);
      toast.success("Facture exportée avec succès");
    } catch (err) {
      console.error("Erreur lors de l’exportation PDF:", err);
      toast.error("Erreur lors de la génération de la facture");
    }
  };

  const exportAllPaiementsPDF = () => {
    try {
      setIsLoading(true);
      const doc = new jsPDF();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      const currentDate = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
      doc.text(`Liste des Paiements (Généré le ${currentDate})`, 10, 10);
      let y = 25;

      doc.setFontSize(12);
      if (paiements.length > 0) {
        paiements.forEach((paiement) => {
          const contrat = contrats.find((c) => c.id === paiement.contrat_id);
          const appartement = appartements.find((a) => a.id === contrat?.appartement_id);
          const locataire = locataires.find((l) => l.id === contrat?.locataire_id);
          const monnaie = appartement ? "GNF" : "EUR";

          const montantFormatted = formatMontantPDF(paiement.montant, monnaie);
          const dateFormatted = formatDate(paiement.date_paiement);
          const text = `- ${appartement?.numero || "Inconnu"} - ${locataire?.nom || "Inconnu"}: ${montantFormatted} - ${dateFormatted} - ${paiement.est_paye ? "Payé" : "Impayé"} - Caution: ${contrat ? formatMontantPDF(contrat.caution, monnaie) : "N/A"}`;

          if (y > 270) {
            doc.addPage();
            y = 10;
          }
          doc.text(text, 10, y);
          y += 7;
        });
      } else {
        doc.text("Aucun paiement à afficher.", 10, y);
      }

      doc.save(`liste_paiements_${currentDate.replace(/\//g, "-")}.pdf`);
      toast.success("Liste des paiements exportée avec succès");
    } catch (err) {
      console.error("Erreur lors de l’exportation de la liste des paiements:", err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>
        <i className="fas fa-money-bill-wave"></i> Ajouter un paiement
      </h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Contrat</label>
          <select
            value={contratId}
            onChange={(e) => setContratId(e.target.value === "" ? "" : Number(e.target.value))}
            required
            disabled={isLoading}
          >
            <option value="">Sélectionner un contrat</option>
            {contrats.map((c) => {
              const appartement = appartements.find((a) => a.id === c.appartement_id);
              const locataire = locataires.find((l) => l.id === c.locataire_id);
              const monnaie = appartement ? "GNF" : "EUR";
              return (
                <option key={c.id} value={c.id}>
                  {appartement?.numero || "Inconnu"} - {locataire?.nom || "Inconnu"} (Loyer: {formatMontant(c.loyer_mensuel, monnaie)}, Caution: {formatMontant(c.caution, monnaie)})
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label>Montant</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="Montant dans la monnaie locale"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label>Date de paiement</label>
          <input
            type="date"
            value={datePaiement}
            onChange={(e) => setDatePaiement(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={estPaye}
              onChange={(e) => setEstPaye(e.target.checked)}
              disabled={isLoading}
            />{" "}
            Payé
          </label>
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>} Ajouter
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <h2>
        <i className="fas fa-list"></i> Liste des paiements
      </h2>
      <button onClick={exportAllPaiementsPDF} style={{ marginBottom: "10px" }} disabled={isLoading}>
        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>} Exporter tous les paiements
      </button>
      {paiements.length === 0 ? (
        <p>Aucun paiement enregistré pour le moment.</p>
      ) : (
        <ul className="paiement-list">
          {paiements.map((paiement) => {
            const contrat = contrats.find((c) => c.id === paiement.contrat_id);
            const appartement = appartements.find((a) => a.id === contrat?.appartement_id);
            const locataire = locataires.find((l) => l.id === contrat?.locataire_id);
            const monnaie = appartement ? "GNF" : "EUR";
            return (
              <li key={paiement.id} className="added">
                <span>
                  <strong>{appartement?.numero || "Inconnu"}</strong> -{" "}
                  <strong>{locataire?.nom || "Inconnu"}</strong>
                  <br />
                  💰 {formatMontant(paiement.montant, monnaie)} - 📅 {formatDate(paiement.date_paiement)} -{" "}
                  {paiement.est_paye ? "✅ Payé" : "❌ Impayé"} - Caution: {contrat ? formatMontant(contrat.caution, monnaie) : "N/A"}
                </span>
                <div>
                  <button
                    onClick={() => exportFacturePDF(paiement)}
                    aria-label={`Télécharger facture pour paiement ${paiement.id}`}
                    disabled={isLoading}
                  >
                    <i className="fas fa-file-pdf"></i>
                  </button>
                  <button
                    onClick={() => handleTogglePaye(paiement)}
                    aria-label={`Marquer comme ${paiement.est_paye ? "impayé" : "payé"}`}
                    disabled={isLoading}
                  >
                    <i className={paiement.est_paye ? "fas fa-times" : "fas fa-check"}></i>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}