import { useState, useRef, FormEvent } from "react";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { Immeuble, Appartement, Etage, Paiement, Contrat, Locataire, MonthlyStat, FactureFournisseur } from "./types";

interface DashboardProps {
  immeubles: Immeuble[];
  appartements: Appartement[];
  etages: Etage[];
  paiements: Paiement[];
  monthlyStats: MonthlyStat[];
  contrats: Contrat[];
  locataires: Locataire[];
  facturesFournisseurs: FactureFournisseur[];
  fetchWithAuth: <T = any>(url: string, options?: RequestInit) => Promise<T>;
  setImmeubles: React.Dispatch<React.SetStateAction<Immeuble[]>>;
  setAppartements: React.Dispatch<React.SetStateAction<Appartement[]>>;
  setEtages: React.Dispatch<React.SetStateAction<Etage[]>>;
  setPaiements: React.Dispatch<React.SetStateAction<Paiement[]>>;
  setMonthlyStats: React.Dispatch<React.SetStateAction<MonthlyStat[]>>;
  setContrats: React.Dispatch<React.SetStateAction<Contrat[]>>;
  setLocataires: React.Dispatch<React.SetStateAction<Locataire[]>>;
  setFacturesFournisseurs: React.Dispatch<React.SetStateAction<FactureFournisseur[]>>;
}

const COLORS_LIGHT = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28BFE"];
const COLORS_DARK = ["#60A5FA", "#34D399", "#FBBF24", "#F87171", "#C4B5FD"];

const formatNumber = (value: number, immeubles: Immeuble[], immeubleId?: number) => {
  const monnaie = immeubleId ? immeubles.find(i => i.id === immeubleId)?.monnaie || "GNF" : "GNF";
  const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} ${monnaie}`;
};

const formatMonth = (month: string) => {
  if (!month || !month.includes("-")) return "Mois inconnu";
  const [year, monthNum] = month.split("-");
  const date = new Date(`${year}-${monthNum}-01`);
  return date.toLocaleString("fr-FR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase());
};

export default function Dashboard({
  immeubles,
  appartements,
  etages,
  paiements,
  monthlyStats,
  contrats,
  locataires,
  facturesFournisseurs,
  fetchWithAuth,
  setImmeubles,
  setAppartements,
  setEtages,
  setPaiements,
  setMonthlyStats,
  setContrats,
  setLocataires,
  setFacturesFournisseurs,
}: DashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [filtrePeriode, setFiltrePeriode] = useState<string>("");
  const [filtreImmeuble, setFiltreImmeuble] = useState<number | "">("");
  const [filtreStatut, setFiltreStatut] = useState<"tous" | "paye" | "impaye">("tous");
  const [sortieContratId, setSortieContratId] = useState<number | null>(null);
  const [sortieMotif, setSortieMotif] = useState<"fin_contrat" | "resiliation" | "">("");
  const [dateSortie, setDateSortie] = useState("");
  const [commentaireEtatLieux, setCommentaireEtatLieux] = useState("");
  const [montantRestitue, setMontantRestitue] = useState("");
  const [commentaireRestitution, setCommentaireRestitution] = useState("");
  const pieChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);

  const isDarkMode = document.body.classList.contains("dark");
  const chartColors = isDarkMode ? COLORS_DARK : COLORS_LIGHT;

  // Filtres dynamiques avec statut
  const paiementsFiltres = paiements.filter(p => {
    const contrat = contrats.find(c => c.id === p.contrat_id);
    const appartement = appartements.find(a => a.id === contrat?.appartement_id);
    const etage = etages.find(e => e.id === appartement?.etage_id);
    return (
      (!filtrePeriode || p.date_paiement.startsWith(filtrePeriode)) &&
      (!filtreImmeuble || etage?.immeuble_id === filtreImmeuble) &&
      (filtreStatut === "tous" || (filtreStatut === "paye" && p.est_paye) || (filtreStatut === "impaye" && !p.est_paye))
    );
  });

  // Statistiques filtrées
  const totalPaiements = paiementsFiltres.reduce((acc, p) => acc + p.montant, 0);
  const totalImpayes = paiementsFiltres.filter(p => !p.est_paye).reduce((acc, p) => acc + p.montant, 0);
  const totalFacturesFournisseurs = facturesFournisseurs.reduce((acc, f) => acc + f.montant, 0);
  const totalImpayesFournisseurs = facturesFournisseurs
    .filter(f => f.statut === "non_payee")
    .reduce((acc, f) => acc + f.montant, 0);

  // KPI
  const tauxOccupation = contrats.length ? (contrats.filter(c => !c.date_fin).length / appartements.length) * 100 : 0;
  const delaiMoyenPaiement = paiementsFiltres.length
    ? paiementsFiltres.reduce((acc, p) => {
        const contrat = contrats.find(c => c.id === p.contrat_id);
        const debut = contrat ? new Date(contrat.date_debut).getTime() : 0;
        const paiementDate = new Date(p.date_paiement).getTime();
        return acc + (paiementDate - debut) / (1000 * 60 * 60 * 24);
      }, 0) / paiementsFiltres.length
    : 0;

  // Répartition par locataire
  const paiementsParLocataire = paiementsFiltres.reduce((acc, p) => {
    const contrat = contrats.find(c => c.id === p.contrat_id);
    const locataireNom = locataires.find(l => l.id === contrat?.locataire_id)?.nom || "Inconnu";
    acc[locataireNom] = (acc[locataireNom] || 0) + p.montant;
    return acc;
  }, {} as Record<string, number>);
  const paiementsTrie = Object.entries(paiementsParLocataire)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Répartition par immeuble
  const paiementsParImmeuble = paiementsFiltres.reduce((acc, p) => {
    const contrat = contrats.find(c => c.id === p.contrat_id);
    const appartement = appartements.find(a => a.id === contrat?.appartement_id);
    const etage = etages.find(e => e.id === appartement?.etage_id);
    const immeuble = immeubles.find(i => i.id === etage?.immeuble_id);
    const immeubleNom = immeuble?.nom || "Inconnu";
    acc[immeubleNom] = {
      montant: (acc[immeubleNom]?.montant || 0) + p.montant,
      immeubleId: immeuble?.id,
    };
    return acc;
  }, {} as Record<string, { montant: number; immeubleId?: number }>);
  const paiementsImmeubleTrie = Object.entries(paiementsParImmeuble)
    .sort((a, b) => b[1].montant - a[1].montant)
    .map(([name, { montant, immeubleId }]) => ({ name, value: montant, immeubleId }));

  // Alertes visuelles
  const contratsExpirant = contrats.filter(c =>
    c.date_fin && (new Date(c.date_fin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) < 30
  );

  const handleOpenSortie = (contrat: Contrat, motif: "fin_contrat" | "resiliation") => {
    setSortieContratId(contrat.id);
    setSortieMotif(motif);
    setCommentaireEtatLieux("");
    setMontantRestitue(contrat.caution.toString());
    setCommentaireRestitution("");
    const today = new Date();
    const defaultDate =
      motif === "resiliation"
        ? new Date(today.setMonth(today.getMonth() + 1)).toISOString().split("T")[0]
        : contrat.date_fin || today.toISOString().split("T")[0];
    setDateSortie(defaultDate);
  };

  const handleSortie = async (e: FormEvent) => {
    e.preventDefault();
    if (!sortieContratId || !sortieMotif) return;

    const contrat = contrats.find(c => c.id === sortieContratId);
    if (!contrat) {
      toast.error("Contrat introuvable");
      return;
    }

    const locataire = locataires.find(l => l.id === contrat.locataire_id)?.nom || "Inconnu";
    const actionText = sortieMotif === "fin_contrat" ? "terminer le contrat" : "résilier le contrat";
    if (!confirm(`Voulez-vous vraiment ${actionText} pour ${locataire} (Appartement ${appartements.find(a => a.id === contrat.appartement_id)?.numero || "Inconnu"}) ?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithAuth<{
        message: string;
        contrat: Contrat;
        avertissementImpayes?: string;
        restitutionId?: number;
        etatLieuxId?: number;
      }>(
        `http://localhost:3001/contrats/${sortieContratId}/sortie`,
        {
          method: "POST",
          body: JSON.stringify({
            motif: sortieMotif,
            dateSortie: dateSortie || undefined,
            commentaireEtatLieux: commentaireEtatLieux || undefined,
            montantRestitue: montantRestitue ? parseFloat(montantRestitue) : undefined,
            commentaireRestitution: commentaireRestitution || undefined,
          }),
        }
      );

      if (response) {
        setContrats(prev =>
          prev.map(c => (c.id === sortieContratId ? { ...c, date_fin: response.contrat.date_fin, statut: response.contrat.statut } : c))
        );
        toast.success(
          `Contrat ${sortieMotif === "fin_contrat" ? "terminé" : "résilié"} avec succès et email envoyé. Date de fin : ${new Date(response.contrat.date_fin!).toLocaleDateString("fr-FR")}`,
          {
            autoClose: 3000,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );

        if (response.avertissementImpayes) {
          toast.warn(response.avertissementImpayes, {
            autoClose: 5000,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }

        if (response.restitutionId) {
          toast.info(`Caution de ${montantRestitue || contrat.caution} GNF enregistrée pour restitution.`, {
            autoClose: 5000,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }

        if (response.etatLieuxId) {
          toast.info("État des lieux de sortie enregistré.", {
            autoClose: 3000,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }

        setSortieContratId(null);
        setSortieMotif("");
        setDateSortie("");
        setCommentaireEtatLieux("");
        setMontantRestitue("");
        setCommentaireRestitution("");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de la gestion de la sortie";
      toast.error(errorMsg, {
        autoClose: 3000,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [
        immeublesData,
        appartementsData,
        etagesData,
        paiementsData,
        monthlyStatsData,
        contratsData,
        locatairesData,
        facturesFournisseursData,
      ] = await Promise.all([
        fetchWithAuth<Immeuble[]>(`http://localhost:3001/biens`),
        fetchWithAuth<Appartement[]>(`http://localhost:3001/appartements`),
        fetchWithAuth<Etage[]>(`http://localhost:3001/etages`),
        fetchWithAuth<Paiement[]>(`http://localhost:3001/paiements`),
        fetchWithAuth<MonthlyStat[]>(`http://localhost:3001/paiements/stats`),
        fetchWithAuth<Contrat[]>(`http://localhost:3001/contrats`),
        fetchWithAuth<Locataire[]>(`http://localhost:3001/locataires`),
        fetchWithAuth<FactureFournisseur[]>(`http://localhost:3001/factures-fournisseurs`),
      ]);

      setImmeubles(immeublesData || []);
      setAppartements(appartementsData || []);
      setEtages(etagesData || []);
      setPaiements(
        (paiementsData || []).map((p: Paiement) => ({
          ...p,
          montant: typeof p.montant === "string" ? parseFloat(p.montant) : p.montant,
        }))
      );
      setMonthlyStats(monthlyStatsData || []);
      setContrats(contratsData || []);
      setLocataires(locatairesData || []);
      setFacturesFournisseurs(facturesFournisseursData || []);

      toast.success("Données rafraîchies avec succès");
    } catch (err) {
      console.error("Erreur lors du rafraîchissement des données:", err);
      toast.error("Erreur lors du rafraîchissement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setIsLoading(true);
      const doc = new jsPDF("p", "mm", "a4");
      const currentDate = new Date().toLocaleDateString("fr-FR");
      let yPosition = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`Tableau de bord - Gestion Locative (Généré le ${currentDate})`, 10, 10);

      autoTable(doc, {
        startY: yPosition,
        head: [["Catégorie", "Valeur"]],
        body: [
          ["Nombre total d’immeubles", immeubles.length.toString()],
          ["Nombre total d’appartements", appartements.length.toString()],
          ["Nombre total de locataires", locataires.length.toString()],
          ["Total des paiements", formatNumber(totalPaiements, immeubles)],
          ["Total des impayés", formatNumber(totalImpayes, immeubles)],
          ["Total des factures fournisseurs", formatNumber(totalFacturesFournisseurs, immeubles)],
          ["Total des factures impayées", formatNumber(totalImpayesFournisseurs, immeubles)],
          ["Taux d’occupation", `${tauxOccupation.toFixed(2)}%`],
          ["Délai moyen de paiement", `${delaiMoyenPaiement.toFixed(1)} jours`],
        ],
        styles: { fontSize: 10 },
      });
      yPosition = doc.lastAutoTable.finalY + 10;

      autoTable(doc, {
        startY: yPosition,
        head: [["Locataire", "Montant"]],
        body: paiementsTrie.map(({ name, value }) => [name, formatNumber(value, immeubles)]),
        styles: { fontSize: 10 },
      });
      yPosition = doc.lastAutoTable.finalY + 10;

      autoTable(doc, {
        startY: yPosition,
        head: [["Immeuble", "Montant"]],
        body: paiementsImmeubleTrie.map(({ name, value, immeubleId }) => [
          name,
          formatNumber(value, immeubles, immeubleId),
        ]),
        styles: { fontSize: 10 },
      });
      yPosition = doc.lastAutoTable.finalY + 10;

      if (totalImpayes > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [["Locataire", "Immeuble", "Appartement", "Montant"]],
          body: paiementsFiltres
            .filter(p => !p.est_paye)
            .slice(0, 5)
            .map(p => {
              const contrat = contrats.find(c => c.id === p.contrat_id);
              const locataire = locataires.find(l => l.id === contrat?.locataire_id)?.nom || "Inconnu";
              const appartement = appartements.find(a => a.id === contrat?.appartement_id);
              const etage = etages.find(e => e.id === appartement?.etage_id);
              const immeuble = immeubles.find(i => i.id === etage?.immeuble_id);
              return [
                locataire,
                immeuble?.nom || "Inconnu",
                appartement?.numero || "Inconnu",
                formatNumber(p.montant, immeubles, immeuble?.id),
              ];
            }),
          styles: { fontSize: 10 },
        });
        yPosition = doc.lastAutoTable.finalY + 10;
      }

      if (contratsExpirant.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [["Locataire", "Appartement", "Date de fin"]],
          body: contratsExpirant.map(c => {
            const locataire = locataires.find(l => l.id === c.locataire_id)?.nom || "Inconnu";
            const appartement = appartements.find(a => a.id === c.appartement_id)?.numero || "Inconnu";
            return [locataire, appartement, c.date_fin || "N/A"];
          }),
          styles: { fontSize: 10 },
        });
        yPosition = doc.lastAutoTable.finalY + 10;
      }

      if (pieChartRef.current) {
        const canvasPie = await html2canvas(pieChartRef.current);
        const imgDataPie = canvasPie.toDataURL("image/png");
        const imgWidth = 180;
        const imgHeight = (canvasPie.height * imgWidth) / canvasPie.width;
        if (yPosition + imgHeight + 15 > 297) {
          doc.addPage();
          yPosition = 10;
        }
        doc.text("Répartition des paiements par locataire", 10, yPosition);
        doc.addImage(imgDataPie, "PNG", 10, yPosition + 5, imgWidth, imgHeight);
        yPosition += imgHeight + 15;
      }

      if (lineChartRef.current) {
        const canvasLine = await html2canvas(lineChartRef.current);
        const imgDataLine = canvasLine.toDataURL("image/png");
        const imgWidth = 180;
        const imgHeight = (canvasLine.height * imgWidth) / canvasLine.width;
        if (yPosition + imgHeight + 15 > 297) {
          doc.addPage();
          yPosition = 10;
        }
        doc.text("Revenus mensuels", 10, yPosition);
        doc.addImage(imgDataLine, "PNG", 10, yPosition + 5, imgWidth, imgHeight);
      }

      doc.save(`Tableau_de_bord_Gestion_Locative_${currentDate.replace(/\//g, "-")}.pdf`);
      toast.success("Tableau de bord exporté avec succès");
    } catch (err) {
      console.error("Erreur lors de l’exportation du tableau de bord:", err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    try {
      setIsLoading(true);
      const wb = XLSX.utils.book_new();
      const currentDate = new Date().toLocaleDateString("fr-FR").replace(/\//g, "-");

      // Feuille 1 : Statistiques
      const statsData = [
        ["Catégorie", "Valeur"],
        ["Nombre total d’immeubles", immeubles.length],
        ["Nombre total d’appartements", appartements.length],
        ["Nombre total de locataires", locataires.length],
        ["Total des paiements", totalPaiements],
        ["Total des impayés", totalImpayes],
        ["Total des factures fournisseurs", totalFacturesFournisseurs],
        ["Total des factures impayées", totalImpayesFournisseurs],
        ["Taux d’occupation", `${tauxOccupation.toFixed(2)}%`],
        ["Délai moyen de paiement", `${delaiMoyenPaiement.toFixed(1)} jours`],
      ];
      const wsStats = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, wsStats, "Statistiques");

      // Feuille 2 : Paiements par locataire
      const locatairesData = [["Locataire", "Montant"], ...paiementsTrie.map(({ name, value }) => [name, value])];
      const wsLocataires = XLSX.utils.aoa_to_sheet(locatairesData);
      XLSX.utils.book_append_sheet(wb, wsLocataires, "Paiements Locataires");

      // Feuille 3 : Paiements par immeuble
      const immeublesData = [
        ["Immeuble", "Montant"],
        ...paiementsImmeubleTrie.map(({ name, value }) => [name, value]),
      ];
      const wsImmeubles = XLSX.utils.aoa_to_sheet(immeublesData);
      XLSX.utils.book_append_sheet(wb, wsImmeubles, "Paiements Immeubles");

      // Feuille 4 : Impayés récents
      if (totalImpayes > 0) {
        const impayesData = [
          ["Locataire", "Immeuble", "Appartement", "Montant"],
          ...paiementsFiltres
            .filter(p => !p.est_paye)
            .slice(0, 5)
            .map(p => {
              const contrat = contrats.find(c => c.id === p.contrat_id);
              const locataire = locataires.find(l => l.id === contrat?.locataire_id)?.nom || "Inconnu";
              const appartement = appartements.find(a => a.id === contrat?.appartement_id);
              const etage = etages.find(e => e.id === appartement?.etage_id);
              const immeuble = immeubles.find(i => i.id === etage?.immeuble_id);
              return [locataire, immeuble?.nom || "Inconnu", appartement?.numero || "Inconnu", p.montant];
            }),
        ];
        const wsImpayes = XLSX.utils.aoa_to_sheet(impayesData);
        XLSX.utils.book_append_sheet(wb, wsImpayes, "Impayés");
      }

      // Feuille 5 : Contrats expirant
      if (contratsExpirant.length > 0) {
        const contratsData = [
          ["Locataire", "Appartement", "Date de fin"],
          ...contratsExpirant.map(c => {
            const locataire = locataires.find(l => l.id === c.locataire_id)?.nom || "Inconnu";
            const appartement = appartements.find(a => a.id === c.appartement_id)?.numero || "Inconnu";
            return [locataire, appartement, c.date_fin || "N/A"];
          }),
        ];
        const wsContrats = XLSX.utils.aoa_to_sheet(contratsData);
        XLSX.utils.book_append_sheet(wb, wsContrats, "Contrats Expirant");
      }

      // Générer le fichier Excel
      XLSX.writeFile(wb, `Tableau_de_bord_Gestion_Locative_${currentDate}.xlsx`);
      toast.success("Tableau de bord exporté en Excel avec succès");
    } catch (err) {
      console.error("Erreur lors de l’exportation Excel:", err);
      toast.error("Erreur lors de la génération du fichier Excel");
    } finally {
      setIsLoading(false);
    }
  };

  // Données filtrées pour le LineChart
  const monthlyStatsFiltres = monthlyStats.map(stat => {
    const paiementsDuMois = paiements.filter(p => p.date_paiement.startsWith(stat.mois));
    const paiementsFiltresDuMois = paiementsDuMois.filter(p => {
      const contrat = contrats.find(c => c.id === p.contrat_id);
      const appartement = appartements.find(a => a.id === contrat?.appartement_id);
      const etage = etages.find(e => e.id === appartement?.etage_id);
      return (
        (!filtreImmeuble || etage?.immeuble_id === filtreImmeuble) &&
        (filtreStatut === "tous" || (filtreStatut === "paye" && p.est_paye) || (filtreStatut === "impaye" && !p.est_paye))
      );
    });
    return {
      ...stat,
      total: paiementsFiltresDuMois.reduce((acc, p) => acc + p.montant, 0),
    };
  });

  return (
    <div className="dashboard-container container">
      <h2>Tableau de bord - Gestion Locative</h2>
      <div className="card dashboard">
        <div className="filters">
          <select value={filtrePeriode} onChange={(e) => setFiltrePeriode(e.target.value)}>
            <option value="">Toutes périodes</option>
            {monthlyStats.map(stat => (
              <option key={stat.mois} value={stat.mois}>{formatMonth(stat.mois)}</option>
            ))}
          </select>
          <select value={filtreImmeuble} onChange={(e) => setFiltreImmeuble(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Tous immeubles</option>
            {immeubles.map(i => (
              <option key={i.id} value={i.id}>{i.nom}</option>
            ))}
          </select>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value as "tous" | "paye" | "impaye")}>
            <option value="tous">Tous statuts</option>
            <option value="paye">Payés</option>
            <option value="impaye">Impayés</option>
          </select>
        </div>
        <div className="dashboard-actions">
          <button onClick={refreshData} disabled={isLoading}>
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
            Rafraîchir
          </button>
          <button onClick={exportToPDF} disabled={isLoading}>
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
            Exporter en PDF
          </button>
          <button onClick={exportToExcel} disabled={isLoading}>
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-excel"></i>}
            Exporter en Excel
          </button>
        </div>

        <div className="stats-section card">
          <h4>Statistiques</h4>
          <table>
            <thead>
              <tr>
                <th>Catégorie</th>
                <th>Valeur</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Nombre total d’immeubles</td><td>{immeubles.length}</td></tr>
              <tr><td>Nombre total d’appartements</td><td>{appartements.length}</td></tr>
              <tr><td>Nombre total de locataires</td><td>{locataires.length}</td></tr>
              <tr><td>Total des paiements</td><td>{formatNumber(totalPaiements, immeubles)}</td></tr>
              <tr><td>Total des impayés</td><td>{formatNumber(totalImpayes, immeubles)}</td></tr>
              <tr><td>Total des factures fournisseurs</td><td>{formatNumber(totalFacturesFournisseurs, immeubles)}</td></tr>
              <tr><td>Total des factures impayées</td><td>{formatNumber(totalImpayesFournisseurs, immeubles)}</td></tr>
              <tr><td>Taux d’occupation</td><td>{tauxOccupation.toFixed(2)}%</td></tr>
              <tr><td>Délai moyen de paiement</td><td>{delaiMoyenPaiement.toFixed(1)} jours</td></tr>
            </tbody>
          </table>
        </div>

        <div className="stats-section card">
          <h4>Paiements par locataire</h4>
          <table>
            <thead><tr><th>Locataire</th><th>Montant</th></tr></thead>
            <tbody>
              {paiementsTrie.map(({ name, value }) => (
                <tr key={name}><td>{name}</td><td>{formatNumber(value, immeubles)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stats-section card">
          <h4>Paiements par immeuble</h4>
          <table>
            <thead><tr><th>Immeuble</th><th>Montant</th></tr></thead>
            <tbody>
              {paiementsImmeubleTrie.map(({ name, value, immeubleId }) => (
                <tr key={name}><td>{name}</td><td>{formatNumber(value, immeubles, immeubleId)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {paiementsFiltres.some(p => !p.est_paye) && (
          <div className="alert-section card error">
            <h4>Impayés récents ({formatNumber(totalImpayes, immeubles)}</h4>
            <ul>
              {paiementsFiltres.filter(p => !p.est_paye).slice(0, 5).map(p => {
                const contrat = contrats.find(c => c.id === p.contrat_id);
                const locataire = locataires.find(l => l.id === contrat?.locataire_id)?.nom || "Inconnu";
                const appartement = appartements.find(a => a.id === contrat?.appartement_id);
                const etage = etages.find(e => e.id === appartement?.etage_id);
                const immeuble = immeubles.find(i => i.id === etage?.immeuble_id);
                return (
                  <li key={p.id}>
                    <strong>{immeuble?.nom || "Inconnu"}</strong> ({appartement?.numero || "Inconnu"}) - {locataire} : {formatNumber(p.montant, immeubles, immeuble?.id)}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {contratsExpirant.length > 0 && (
          <div className="alert-section card warning">
            <h4>Contrats expirant bientôt ({contratsExpirant.length})</h4>
            <ul>
              {contratsExpirant.map(c => {
                const locataire = locataires.find(l => l.id === c.locataire_id)?.nom || "Inconnu";
                const appartement = appartements.find(a => a.id === c.appartement_id)?.numero || "Inconnu";
                return (
                  <li key={c.id}>
                    {locataire} ({appartement}) - Expire le {c.date_fin}
                    <div style={{ marginTop: "5px" }}>
                      <button
                        onClick={() => handleOpenSortie(c, "fin_contrat")}
                        disabled={isLoading}
                        style={{ marginRight: "10px" }}
                        aria-label={`Terminer contrat ${c.id}`}
                      >
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-out-alt"></i>} Fin de contrat
                      </button>
                      <button
                        onClick={() => handleOpenSortie(c, "resiliation")}
                        disabled={isLoading}
                        aria-label={`Résilier contrat ${c.id}`}
                      >
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-times"></i>} Résilier
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div ref={pieChartRef} className="chart-section card">
          <h4>Répartition des paiements par locataire</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={paiementsTrie} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                {paiementsTrie.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div ref={lineChartRef} className="chart-section card">
          <h4>Revenus mensuels</h4>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyStatsFiltres} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#6b7280" : "#d1d5db"} opacity={0.7} />
              <XAxis
                dataKey="mois"
                tickFormatter={formatMonth}
                stroke={isDarkMode ? "#e2e8f0" : "#1e293b"}
                tick={{ fontSize: 14, fill: isDarkMode ? "#e2e8f0" : "#1e293b" }}
                angle={-45}
                textAnchor="end"
                height={70}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke={isDarkMode ? "#e2e8f0" : "#1e293b"}
                tick={{ fontSize: 14, fill: isDarkMode ? "#e2e8f0" : "#1e293b" }}
                tickFormatter={(value) => formatNumber(Number(value), immeubles)}
                width={100}
              />
              <Tooltip
                formatter={(value) => formatNumber(Number(value), immeubles)}
                labelFormatter={formatMonth}
                contentStyle={{
                  backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                  borderColor: isDarkMode ? "#4b5563" : "#e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                  fontSize: "14px",
                  boxShadow: isDarkMode ? "0 2px 10px rgba(0, 0, 0, 0.5)" : "0 2px 10px rgba(0, 0, 0, 0.1)",
                }}
                itemStyle={{ color: isDarkMode ? "#e2e8f0" : "#1e293b" }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke={isDarkMode ? "#93c5fd" : "#2563eb"}
                strokeWidth={3}
                dot={{ r: 5, fill: isDarkMode ? "#93c5fd" : "#2563eb", strokeWidth: 2 }}
                activeDot={{ r: 8 }}
              />
              <Legend verticalAlign="top" height={36} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {sortieContratId && (
          <div className="modal" style={{ position: "fixed", top: "20%", left: "20%", right: "20%", background: isDarkMode ? "#1f2937" : "white", padding: "20px", border: "1px solid #ccc", zIndex: 1000, color: isDarkMode ? "#e2e8f0" : "#1e293b" }}>
            <h3>Gérer la sortie du contrat</h3>
            <form onSubmit={handleSortie}>
              <div>
                <label>Date de fin</label>
                <input
                  type="date"
                  value={dateSortie}
                  onChange={(e) => setDateSortie(e.target.value)}
                  min={sortieMotif === "resiliation" ? new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}
                  disabled={isLoading}
                  required
                  style={{ width: "100%", padding: "5px", color: isDarkMode ? "#e2e8f0" : "#1e293b", background: isDarkMode ? "#374151" : "#fff" }}
                />
              </div>
              <div>
                <label>État des lieux (commentaire)</label>
                <textarea
                  value={commentaireEtatLieux}
                  onChange={(e) => setCommentaireEtatLieux(e.target.value)}
                  placeholder="Ex. Tout en bon état, aucune réparation nécessaire"
                  disabled={isLoading}
                  rows={4}
                  style={{ width: "100%", padding: "5px", color: isDarkMode ? "#e2e8f0" : "#1e293b", background: isDarkMode ? "#374151" : "#fff" }}
                />
              </div>
              <div>
                <label>Montant de la caution à restituer (GNF)</label>
                <input
                  type="number"
                  value={montantRestitue}
                  onChange={(e) => setMontantRestitue(e.target.value)}
                  placeholder="Ex. 1000000"
                  disabled={isLoading}
                  min="0"
                  step="1"
                  style={{ width: "100%", padding: "5px", color: isDarkMode ? "#e2e8f0" : "#1e293b", background: isDarkMode ? "#374151" : "#fff" }}
                />
              </div>
              <div>
                <label>Commentaire sur la restitution</label>
                <input
                  value={commentaireRestitution}
                  onChange={(e) => setCommentaireRestitution(e.target.value)}
                  placeholder="Ex. Restitution complète"
                  disabled={isLoading}
                  style={{ width: "100%", padding: "5px", color: isDarkMode ? "#e2e8f0" : "#1e293b", background: isDarkMode ? "#374151" : "#fff" }}
                />
              </div>
              <button type="submit" disabled={isLoading} style={{ marginRight: "10px" }}>
                {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>} Confirmer la sortie
              </button>
              <button
                type="button"
                onClick={() => setSortieContratId(null)}
                disabled={isLoading}
              >
                Annuler
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}