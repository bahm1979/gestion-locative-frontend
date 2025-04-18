import { useState, useEffect, FormEvent } from "react";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import { Locataire, Contrat } from "./types"; // Importer depuis types.ts

interface LocataireListProps {
  locataires: Locataire[];
  onAdd: (locataire: Locataire) => void;
  onDelete: (id: number) => void;
  onUpdate: (locataire: Locataire) => void;
  fetchWithAuth: <T>(url: string, options?: RequestInit) => Promise<T | undefined>;
}

const calculateAge = (dateNaissance?: string): string => {
  if (!dateNaissance) return "N/A";
  const today = new Date();
  const birthDate = new Date(dateNaissance);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age.toString();
};

const formatTelephone = (tel?: string) => {
  if (!tel) return "N/A";
  const cleaned = tel.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
  }
  return tel;
};

export default function LocataireList({ locataires, onAdd, onDelete, onUpdate, fetchWithAuth }: LocataireListProps) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [sortieContratId, setSortieContratId] = useState<number | null>(null);
  const [sortieMotif, setSortieMotif] = useState<"fin_contrat" | "resiliation" | "">("");
  const [commentaireEtatLieux, setCommentaireEtatLieux] = useState("");
  const [montantRestitue, setMontantRestitue] = useState("");
  const [commentaireRestitution, setCommentaireRestitution] = useState("");
  const [dateSortie, setDateSortie] = useState("");

  useEffect(() => {
    const fetchContrats = async () => {
      try {
        const contratsData = await fetchWithAuth<Contrat[]>("http://localhost:3001/contrats");
        if (contratsData) {
          setContrats(contratsData);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des contrats:", err);
        toast.error("Erreur lors du chargement des contrats");
      }
    };
    fetchContrats();
  }, [fetchWithAuth]);

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
        : today.toISOString().split("T")[0];
    setDateSortie(defaultDate);
  };

  const handleSortie = async (e: FormEvent) => {
    e.preventDefault();
    if (!sortieContratId || !sortieMotif) return;

    const contrat = contrats.find((c) => c.id === sortieContratId);
    if (!contrat) {
      toast.error("Contrat introuvable");
      return;
    }

    const actionText = sortieMotif === "fin_contrat" ? "terminer le contrat" : "résilier le contrat";
    if (
      !confirm(
        `Voulez-vous vraiment ${actionText} pour ${
          locataires.find((l) => l.id === contrat.locataire_id)?.nom
        } (Appartement ${contrat.appartement_nom || "Inconnu"}) ?`
      )
    ) {
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
      }>(`http://localhost:3001/contrats/${sortieContratId}/sortie`, {
        method: "POST",
        body: JSON.stringify({
          motif: sortieMotif,
          dateSortie: dateSortie || undefined,
          commentaireEtatLieux: commentaireEtatLieux || undefined,
          montantRestitue: montantRestitue ? parseFloat(montantRestitue) : undefined,
          commentaireRestitution: commentaireRestitution || undefined,
        }),
      });

      if (response) {
        setContrats((prev) =>
          prev.map((c) =>
            c.id === sortieContratId
              ? { ...c, date_fin: response.contrat.date_fin, statut: response.contrat.statut }
              : c
          )
        );
        toast.success(
          `Contrat ${sortieMotif === "fin_contrat" ? "terminé" : "résilié"} avec succès. Date de fin : ${new Date(
            response.contrat.date_fin!
          ).toLocaleDateString("fr-FR")}`,
          { autoClose: 3000, closeOnClick: true, pauseOnHover: true, draggable: true }
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
      toast.error(errorMsg, { autoClose: 3000, closeOnClick: true, pauseOnHover: true, draggable: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!nom) {
      setError("Le nom est requis !");
      setIsLoading(false);
      return;
    }

    const newLocataire: Locataire = {
      id: 0, // L'ID sera attribué par le backend
      nom,
      email: email || undefined,
      telephone: telephone || undefined,
      date_naissance: dateNaissance || undefined,
      lieu_naissance: lieuNaissance || undefined,
    };

    try {
      const savedLocataire = await fetchWithAuth<Locataire>("http://localhost:3001/locataires", {
        method: "POST",
        body: JSON.stringify(newLocataire),
      });
      if (savedLocataire) {
        onAdd(savedLocataire);
        toast.success(`Locataire "${nom}" ajouté avec succès`, {
          autoClose: 3000,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }

      setNom("");
      setEmail("");
      setTelephone("");
      setDateNaissance("");
      setLieuNaissance("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMsg);
      toast.error(errorMsg, { autoClose: 3000, closeOnClick: true, pauseOnHover: true, draggable: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (locataire: Locataire) => {
    setEditingId(locataire.id);
    setNom(locataire.nom);
    setEmail(locataire.email || "");
    setTelephone(locataire.telephone || "");
    setDateNaissance(locataire.date_naissance || "");
    setLieuNaissance(locataire.lieu_naissance || "");
    setError(null);
  };

  const handleUpdate = async (id: number) => {
    setError(null);
    setIsLoading(true);

    if (!nom) {
      setError("Le nom est requis !");
      setIsLoading(false);
      return;
    }

    const updatedLocataire: Locataire = {
      id,
      nom,
      email: email || undefined,
      telephone: telephone || undefined,
      date_naissance: dateNaissance || undefined,
      lieu_naissance: lieuNaissance || undefined,
    };

    try {
      const savedLocataire = await fetchWithAuth<Locataire>(`http://localhost:3001/locataires/${id}`, {
        method: "PUT",
        body: JSON.stringify(updatedLocataire),
      });
      if (savedLocataire) {
        onUpdate(savedLocataire);
        toast.success(`Locataire "${nom}" mis à jour avec succès`, {
          autoClose: 3000,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }

      setEditingId(null);
      setNom("");
      setEmail("");
      setTelephone("");
      setDateNaissance("");
      setLieuNaissance("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMsg);
      toast.error(errorMsg, { autoClose: 3000, closeOnClick: true, pauseOnHover: true, draggable: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, nom: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchWithAuth<void>(`http://localhost:3001/locataires/${id}`, {
        method: "DELETE",
      });
      onDelete(id);
      toast.success(`Locataire "${nom}" supprimé avec succès`, {
        autoClose: 3000,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de la suppression";
      setError(errorMsg);
      toast.error(errorMsg, { autoClose: 3000, closeOnClick: true, pauseOnHover: true, draggable: true });
    } finally {
      setIsLoading(false);
    }
  };

  const exportLocatairePDF = (locataire: Locataire) => {
    try {
      const doc = new jsPDF();
      doc.setFont("times", "normal");
      doc.setFontSize(16);
      doc.text(`Fiche Locataire: ${locataire.nom}`, 10, 10);

      doc.setFontSize(12);
      doc.text(`Nom: ${locataire.nom}`, 10, 30);
      doc.text(`Email: ${locataire.email || "N/A"}`, 10, 40);
      doc.text(`Téléphone: ${formatTelephone(locataire.telephone)}`, 10, 50);
      doc.text(
        `Date de naissance: ${locataire.date_naissance ? new Date(locataire.date_naissance).toLocaleDateString("fr-FR") + ` (${calculateAge(locataire.date_naissance)} ans)` : "N/A"}`,
        10,
        60
      );
      doc.text(`Lieu de naissance: ${locataire.lieu_naissance || "N/A"}`, 10, 70);

      const contratsLocataire = contrats.filter((c) => c.locataire_id === locataire.id && c.statut === "actif");
      if (contratsLocataire.length > 0) {
        doc.text("Contrats actifs:", 10, 90);
        let y = 100;
        contratsLocataire.forEach((c) => {
          doc.text(
            `- Appartement ${c.appartement_nom || "Inconnu"}, Début: ${new Date(c.date_debut).toLocaleDateString("fr-FR")}, Loyer: ${c.loyer_mensuel}, Caution: ${c.caution}`,
            10,
            y
          );
          y += 10;
        });
      } else {
        doc.text("Aucun contrat actif.", 10, 90);
      }

      doc.save(`Locataire_${locataire.nom}_${locataire.id}.pdf`);
      toast.success(`Fiche de "${locataire.nom}" exportée avec succès`);
    } catch (err) {
      console.error("Erreur lors de l’exportation du locataire:", err);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const exportAllLocatairesPDF = () => {
    try {
      setIsLoading(true);
      const doc = new jsPDF();
      doc.setFont("times", "normal");
      doc.setFontSize(16);
      const currentDate = new Date().toLocaleDateString("fr-FR");
      doc.text(`Liste des locataires (Généré le ${currentDate})`, 10, 10);
      let y = 25;

      doc.setFontSize(10);
      locataires.forEach((locataire) => {
        const contratsLocataire = contrats.filter((c) => c.locataire_id === locataire.id && c.statut === "actif");
        const contratText =
          contratsLocataire.length > 0
            ? `Contrats: ${contratsLocataire.map((c) => `Appartement ${c.appartement_nom || "Inconnu"}`).join(", ")}`
            : "Aucun contrat actif";
        const text = `- ${locataire.nom} - ${locataire.email || "N/A"} (${formatTelephone(locataire.telephone)}) - Naissance: ${
          locataire.date_naissance
            ? new Date(locataire.date_naissance).toLocaleDateString("fr-FR") + ` (${calculateAge(locataire.date_naissance)} ans)`
            : "N/A"
        } - ${locataire.lieu_naissance || "N/A"} - ${contratText}`;
        const splitText = doc.splitTextToSize(text, 170);
        splitText.forEach((line: string) => {
          doc.text(line, 10, y);
          y += 7;
        });
      });

      doc.save("liste_locataires.pdf");
      toast.success("Liste des locataires exportée avec succès");
    } catch (err) {
      console.error("Erreur lors de l’exportation de la liste des locataires:", err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>
        <i className="fas fa-users"></i> Ajouter un locataire
      </h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nom</label>
          <input
            placeholder="Nom complet"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            placeholder="exemple@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div>
          <label>Téléphone</label>
          <input
            placeholder="0123456789"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div>
          <label>Date de naissance</label>
          <input
            type="date"
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div>
          <label>Lieu de naissance</label>
          <input
            placeholder="Ex. Paris, France"
            value={lieuNaissance}
            onChange={(e) => setLieuNaissance(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>} Ajouter
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <h2>
        <i className="fas fa-list"></i> Liste des locataires
      </h2>
      <button onClick={exportAllLocatairesPDF} style={{ marginBottom: "10px" }} disabled={isLoading}>
        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>} Exporter tous les locataires
      </button>
      {locataires.length === 0 ? (
        <p>Aucun locataire enregistré pour le moment.</p>
      ) : (
        <ul>
          {locataires.map((locataire) => {
            const contratsLocataire = contrats.filter((c) => c.locataire_id === locataire.id && c.statut === "actif");
            return (
              <li key={locataire.id} className="added">
                {editingId === locataire.id ? (
                  <>
                    <input
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                    <input
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      disabled={isLoading}
                    />
                    <input
                      type="date"
                      value={dateNaissance}
                      onChange={(e) => setDateNaissance(e.target.value)}
                      disabled={isLoading}
                    />
                    <input
                      placeholder="Ex. Paris, France"
                      value={lieuNaissance}
                      onChange={(e) => setLieuNaissance(e.target.value)}
                      disabled={isLoading}
                    />
                    <button onClick={() => handleUpdate(locataire.id)} disabled={isLoading}>
                      {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Sauvegarder
                    </button>
                    <button onClick={() => setEditingId(null)} disabled={isLoading}>
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <span>
                      <strong>{locataire.nom}</strong> - {locataire.email || "N/A"} ({formatTelephone(locataire.telephone)}) -{" "}
                      {locataire.date_naissance
                        ? `${new Date(locataire.date_naissance).toLocaleDateString("fr-FR")} (${calculateAge(locataire.date_naissance)} ans)`
                        : "N/A"}{" "}
                      - {locataire.lieu_naissance || "N/A"}
                    </span>
                    <div>
                      <button onClick={() => handleEdit(locataire)} aria-label={`Modifier ${locataire.nom}`} disabled={isLoading}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(locataire.id, locataire.nom)}
                        aria-label={`Supprimer ${locataire.nom}`}
                        disabled={isLoading}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                      <button onClick={() => exportLocatairePDF(locataire)} aria-label={`Exporter ${locataire.nom}`} disabled={isLoading}>
                        <i className="fas fa-file-pdf"></i>
                      </button>
                    </div>
                    {contratsLocataire.length > 0 && (
                      <div style={{ marginTop: "10px" }}>
                        <strong>Contrats actifs :</strong>
                        <ul>
                          {contratsLocataire.map((c) => (
                            <li key={c.id}>
                              Appartement {c.appartement_nom || "Inconnu"}, Début: {new Date(c.date_debut).toLocaleDateString("fr-FR")}, Loyer: {c.loyer_mensuel}, Caution: {c.caution}
                              <div>
                                <button
                                  onClick={() => handleOpenSortie(c, "fin_contrat")}
                                  disabled={isLoading}
                                  style={{ marginLeft: "10px" }}
                                  aria-label={`Terminer contrat ${c.id}`}
                                >
                                  {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-out-alt"></i>} Fin de contrat
                                </button>
                                <button
                                  onClick={() => handleOpenSortie(c, "resiliation")}
                                  disabled={isLoading}
                                  style={{ marginLeft: "10px" }}
                                  aria-label={`Résilier contrat ${c.id}`}
                                >
                                  {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-times"></i>} Résilier
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {sortieContratId && (
        <div
          className="modal"
          style={{ position: "fixed", top: "20%", left: "20%", right: "20%", background: "white", padding: "20px", border: "1px solid #ccc", zIndex: 1000 }}
        >
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
                style={{ width: "100%" }}
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
              />
            </div>
            <div>
              <label>Commentaire sur la restitution</label>
              <input
                value={commentaireRestitution}
                onChange={(e) => setCommentaireRestitution(e.target.value)}
                placeholder="Ex. Restitution complète"
                disabled={isLoading}
              />
            </div>
            <button type="submit" disabled={isLoading}>
              {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>} Confirmer la sortie
            </button>
            <button type="button" onClick={() => setSortieContratId(null)} disabled={isLoading} style={{ marginLeft: "10px" }}>
              Annuler
            </button>
          </form>
        </div>
      )}
    </div>
  );
}