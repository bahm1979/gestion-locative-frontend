import { useState, FormEvent } from "react";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import { Appartement, Locataire, Contrat } from "./types";

// Importer le logo (assure-toi que public/images/logo.png existe)
import logo from '../assets/logo.png'; // Chemin relatif depuis public/

interface ContratListProps {
  contrats: Contrat[] | null;
  appartements: Appartement[] | null;
  locataires: Locataire[] | null;
  onAdd: (contrat: Contrat) => void;
  onDelete: (id: number) => void;
  onUpdate: (contrat: Contrat) => void;
  fetchWithAuth: <T>(url: string, options?: RequestInit) => Promise<T | undefined>;
}

// Coordonnées du gestionnaire (à personnaliser)
const gestionnaire = {
  nom: "Mouctar KANTE",
  adresse: "Conakry, Guinée",
  telephone: "+24 596 660 51 30",
  email: "bahmmouctar@gmail.com",
};

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
  return montant.toLocaleString("fr-FR", { style: "currency", currency: monnaie });
};

const formatMontantPDF = (montant: number | undefined, monnaie: string) => {
  if (montant === undefined || montant === null) return `0.00 ${monnaie}`;
  return montant.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + monnaie;
};

const cleanString = (str: string | undefined) => {
  return str ? str.replace(/\s+/g, " ").trim() : "Inconnu";
};

export default function ContratList({
  contrats,
  appartements,
  locataires,
  onAdd,
  onDelete,
  onUpdate,
  fetchWithAuth,
}: ContratListProps) {
  const [appartementId, setAppartementId] = useState<number | "">("");
  const [locataireId, setLocataireId] = useState<number | "">("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [loyerMensuel, setLoyerMensuel] = useState("");
  const [caution, setCaution] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (appartementId === "" || locataireId === "" || !dateDebut || !loyerMensuel || !caution) {
      setError("Tous les champs obligatoires sont requis, y compris la caution !");
      setIsLoading(false);
      return;
    }

    const parsedLoyer = parseFloat(loyerMensuel);
    const parsedCaution = parseFloat(caution);
    if (isNaN(parsedLoyer) || parsedLoyer <= 0 || isNaN(parsedCaution) || parsedCaution < 0) {
      setError("Le loyer doit être positif et la caution ne peut pas être négative !");
      setIsLoading(false);
      return;
    }

    if (!appartements) {
      setError("Aucun appartement disponible !");
      setIsLoading(false);
      return;
    }

    const appartement = appartements.find((a) => a.id === Number(appartementId));
    if (!appartement) {
      setError("Appartement sélectionné invalide !");
      setIsLoading(false);
      return;
    }

    const locataireNom = locataires?.find((l) => l.id === Number(locataireId))?.nom || "Inconnu";
    const contratData: Contrat = {
      id: editingId || 0,
      appartement_id: Number(appartementId),
      locataire_id: Number(locataireId),
      date_debut: dateDebut,
      date_fin: dateFin || null,
      loyer_mensuel: parsedLoyer,
      caution: parsedCaution,
      appartement_nom: appartement.numero,
      locataire_nom: locataireNom,
    };

    try {
      if (editingId) {
        const updatedContrat = await fetchWithAuth<Contrat>(`http://localhost:3001/contrats/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            appartement_id: contratData.appartement_id,
            locataire_id: contratData.locataire_id,
            date_debut: contratData.date_debut,
            date_fin: contratData.date_fin,
            loyer_mensuel: contratData.loyer_mensuel,
            caution: contratData.caution,
          }),
        });
        if (updatedContrat) {
          onUpdate({ ...updatedContrat, appartement_nom: contratData.appartement_nom, locataire_nom: contratData.locataire_nom });
          toast.success("Contrat modifié avec succès et email envoyé");
          setEditingId(null);
        }
      } else {
        const savedContrat = await fetchWithAuth<Contrat>("http://localhost:3001/contrats", {
          method: "POST",
          body: JSON.stringify({
            appartement_id: contratData.appartement_id,
            locataire_id: contratData.locataire_id,
            date_debut: contratData.date_debut,
            date_fin: contratData.date_fin,
            loyer_mensuel: contratData.loyer_mensuel,
            caution: contratData.caution,
          }),
        });
        if (savedContrat) {
          onAdd({ ...savedContrat, appartement_nom: contratData.appartement_nom, locataire_nom: contratData.locataire_nom });
          toast.success("Contrat créé avec succès et email envoyé");
        }
      }
      setAppartementId("");
      setLocataireId("");
      setDateDebut("");
      setDateFin("");
      setLoyerMensuel("");
      setCaution("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (contrat: Contrat) => {
    setEditingId(contrat.id);
    setAppartementId(contrat.appartement_id);
    setLocataireId(contrat.locataire_id);
    setDateDebut(contrat.date_debut);
    setDateFin(contrat.date_fin || "");
    setLoyerMensuel(contrat.loyer_mensuel.toString());
    setCaution(contrat.caution?.toString() || "0");
    setError(null);
  };

  const handleDelete = async (id: number, locataireNom: string) => {
    if (!confirm(`Voulez-vous vraiment résilier le contrat de ${locataireNom} ?`)) return;

    setError(null);
    setIsLoading(true);
    try {
      await fetchWithAuth<void>(`http://localhost:3001/contrats/${id}`, { method: "DELETE" });
      onDelete(id);
      toast.success("Contrat résilié avec succès et email envoyé");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de la résiliation";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const exportContratPDF = (contrat: Contrat) => {
    try {
      const doc = new jsPDF();
      const appartement = appartements?.find((a) => a.id === contrat.appartement_id);
      const locataire = locataires?.find((l) => l.id === contrat.locataire_id);
      const monnaie = appartement ? "GNF" : "EUR";

      // Ajouter le logo
      doc.addImage(logo, "PNG", 10, 10, 50, 20); // Logo en haut à gauche (ajuste les dimensions si besoin)

      // Titre
      doc.setFont("courier", "normal");
      doc.setFontSize(16);
      doc.text("Contrat de Location", 70, 20);

      // Coordonnées du gestionnaire
      doc.setFontSize(10);
      doc.text(`Gestionnaire: ${gestionnaire.nom}`, 10, 35);
      doc.text(`Adresse: ${gestionnaire.adresse}`, 10, 40);
      doc.text(`Téléphone: ${gestionnaire.telephone}`, 10, 45);
      doc.text(`Email: ${gestionnaire.email}`, 10, 50);

      // Détails du contrat
      doc.setFontSize(12);
      doc.text(`Appartement: ${cleanString(appartement?.numero || contrat.appartement_nom)}`, 10, 65);
      doc.text(`Locataire: ${cleanString(locataire?.nom || contrat.locataire_nom)}`, 10, 75);
      doc.text(`Début: ${formatDate(contrat.date_debut)}`, 10, 85);
      doc.text(`Fin: ${contrat.date_fin ? formatDate(contrat.date_fin) : "En cours"}`, 10, 95);
      doc.text(`Loyer mensuel: ${formatMontantPDF(contrat.loyer_mensuel, monnaie)}`, 10, 105);
      doc.text(`Caution: ${formatMontantPDF(contrat.caution, monnaie)}`, 10, 115);

      doc.save(`Contrat_${cleanString(locataire?.nom || contrat.locataire_nom)}_${contrat.id}.pdf`);
      toast.success("Contrat exporté avec succès");
    } catch (err) {
      console.error("Erreur lors de l’exportation du contrat PDF:", err);
      toast.error("Erreur lors de la génération du contrat");
    }
  };

  const exportAllContratsPDF = () => {
    try {
      setIsLoading(true);
      const doc = new jsPDF();
      doc.setFont("courier", "normal");

      // Ajouter le logo
      doc.addImage(logo, "PNG", 10, 10, 50, 20); // Logo en haut à gauche

      // Titre
      doc.setFontSize(16);
      const currentDate = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
      doc.text(`Liste des Contrats (Généré le ${currentDate})`, 70, 20);

      // Coordonnées du gestionnaire
      doc.setFontSize(10);
      doc.text(`Gestionnaire: ${gestionnaire.nom}`, 10, 35);
      doc.text(`Adresse: ${gestionnaire.adresse}`, 10, 40);
      doc.text(`Téléphone: ${gestionnaire.telephone}`, 10, 45);
      doc.text(`Email: ${gestionnaire.email}`, 10, 50);

      // Contenu
      doc.setFontSize(10);
      let y = 60;
      const pageWidth = doc.internal.pageSize.getWidth() - 20;

      if (contrats && contrats.length > 0) {
        contrats.forEach((contrat) => {
          if (!appartements || !locataires) return;

          const appartement = appartements.find((a) => a.id === contrat.appartement_id);
          const locataire = locataires.find((l) => l.id === contrat.locataire_id);
          const monnaie = appartement ? "GNF" : "EUR";

          const text = `${cleanString(appartement?.numero || contrat.appartement_nom)} loué à ${cleanString(locataire?.nom || contrat.locataire_nom)}: ` +
                       `${formatDate(contrat.date_debut)} - ${contrat.date_fin ? formatDate(contrat.date_fin) : "En cours"} - ` +
                       `Loyer: ${formatMontantPDF(contrat.loyer_mensuel, monnaie)} - ` +
                       `Caution: ${formatMontantPDF(contrat.caution, monnaie)}`;

          const splitText = doc.splitTextToSize(text, pageWidth);
          
          if (y + splitText.length * 5 > 270) {
            doc.addPage();
            y = 10;
            // Ajouter le logo sur chaque nouvelle page
            doc.addImage(logo, "PNG", 10, 10, 50, 20);
            doc.setFontSize(16);
            doc.text(`Liste des Contrats (Suite)`, 70, 20);
          }

          splitText.forEach((line: string) => {
            doc.text(line, 10, y);
            y += 5;
          });

          y += 2;
        });
      } else {
        doc.text("Aucun contrat à afficher.", 10, y);
      }

      doc.save("liste_contrats.pdf");
      toast.success("Liste des contrats exportée avec succès");
    } catch (err) {
      console.error("Erreur lors de l’exportation de la liste des contrats:", err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>
        <i className="fas fa-file-contract"></i> {editingId ? "Modifier un contrat" : "Créer un contrat"}
      </h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Appartement</label>
          <select
            value={appartementId}
            onChange={(e) => setAppartementId(e.target.value === "" ? "" : Number(e.target.value))}
            required
            disabled={isLoading}
          >
            <option value="">Sélectionner un appartement</option>
            {appartements && appartements.map((a) => (
              <option key={a.id} value={a.id}>
                {a.numero} ({a.surface} m²)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Locataire</label>
          <select
            value={locataireId}
            onChange={(e) => setLocataireId(e.target.value === "" ? "" : Number(e.target.value))}
            required
            disabled={isLoading}
          >
            <option value="">Sélectionner un locataire</option>
            {locataires && locataires.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom} ({l.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Date de début</label>
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label>Date de fin (optionnelle)</label>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div>
          <label>Loyer mensuel</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={loyerMensuel}
            onChange={(e) => setLoyerMensuel(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label>Caution</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={caution}
            onChange={(e) => setCaution(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : editingId ? "Modifier" : "Créer"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <h2>
        <i className="fas fa-list"></i> Liste des contrats
      </h2>
      <button onClick={exportAllContratsPDF} disabled={isLoading}>
        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : "Exporter tous les contrats"}
      </button>
      {!contrats || contrats.length === 0 ? (
        <p>Aucun contrat enregistré.</p>
      ) : (
        <ul className="contrat-list">
          {contrats.map((contrat) => {
            const appartement = appartements?.find((a) => a.id === contrat.appartement_id);
            const locataire = locataires?.find((l) => l.id === contrat.locataire_id);
            const monnaie = appartement ? "GNF" : "EUR";
            return (
              <li key={contrat.id}>
                <span>
                  <strong>{appartement?.numero || contrat.appartement_nom || "Inconnu"}</strong> loué à{" "}
                  <strong>{locataire?.nom || contrat.locataire_nom || "Inconnu"}</strong>
                  <br />
                  📅 {formatDate(contrat.date_debut)} - {contrat.date_fin ? formatDate(contrat.date_fin) : "En cours"} - 💰{" "}
                  {formatMontant(contrat.loyer_mensuel, monnaie)} - Caution: {formatMontant(contrat.caution, monnaie)}
                </span>
                <div>
                  <button onClick={() => handleEdit(contrat)} disabled={isLoading}>
                    <i className="fas fa-edit"></i>
                  </button>
                  <button onClick={() => exportContratPDF(contrat)} disabled={isLoading}>
                    <i className="fas fa-file-pdf"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(contrat.id, locataire?.nom || contrat.locataire_nom || "Inconnu")}
                    disabled={isLoading}
                  >
                    <i className="fas fa-trash"></i>
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