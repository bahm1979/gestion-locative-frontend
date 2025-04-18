import { useState, FormEvent } from "react";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import { Ville, Immeuble, Etage, Appartement } from "./types";

interface ImmeubleListProps {
  immeubles: Immeuble[];
  etages: Etage[];
  appartements: Appartement[];
  villes: Ville[];
  onAddImmeuble: (immeuble: Immeuble) => void;
  onAddEtage: (etage: Etage) => void;
  onAddAppartement: (appartement: Appartement) => void;
  onDeleteImmeuble: (id: number) => void;
  onDeleteEtage: (id: number) => void;
  onDeleteAppartement: (id: number) => void;
  fetchWithAuth: <T>(url: string, options?: RequestInit) => Promise<T | undefined>;
}

export default function ImmeubleList({
  immeubles,
  etages,
  appartements,
  villes,
  onAddImmeuble,
  onAddEtage,
  onAddAppartement,
  onDeleteImmeuble,
  onDeleteEtage,
  onDeleteAppartement,
  fetchWithAuth,
}: ImmeubleListProps) {
  const [nomImmeuble, setNomImmeuble] = useState("");
  const [adresse, setAdresse] = useState("");
  const [villeId, setVilleId] = useState<number | "">("");
  const [etagesImmeuble, setEtagesImmeuble] = useState("");
  const [immeubleIdEtage, setImmeubleIdEtage] = useState<number | "">("");
  const [numeroEtage, setNumeroEtage] = useState("");
  const [etageId, setEtageId] = useState<number | "">("");
  const [numeroApt, setNumeroApt] = useState("");
  const [chambres, setChambres] = useState("");
  const [sallesDeBain, setSallesDeBain] = useState("");
  const [surface, setSurface] = useState("");
  const [balcon, setBalcon] = useState(false);
  const [cuisineEquipee, setCuisineEquipee] = useState(false);
  const [loyer, setLoyer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const formatMontant = (montant: number, monnaie: string) => {
    try {
      return montant.toLocaleString("fr-FR", { style: "currency", currency: monnaie });
    } catch (err) {
      return `${montant} ${monnaie}`;
    }
  };

  const handleAddImmeuble = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!nomImmeuble || !adresse || villeId === "" || !etagesImmeuble) {
      setError("Tous les champs sont obligatoires pour l’immeuble !");
      setIsLoading(false);
      return;
    }

    const ville = villes.find((v) => v.id === Number(villeId));
    if (!ville) {
      setError("Ville sélectionnée invalide !");
      setIsLoading(false);
      return;
    }

    const newImmeuble: Immeuble = {
      id: 0,
      nom: nomImmeuble,
      adresse,
      ville_id: Number(villeId),
      etages: parseInt(etagesImmeuble),
      monnaie: ville.monnaie,
    };

    try {
      const savedImmeuble = await fetchWithAuth<Immeuble>("http://localhost:3001/biens", {
        method: "POST",
        body: JSON.stringify(newImmeuble),
      });
      if (savedImmeuble) {
        onAddImmeuble(savedImmeuble);
        toast.success(`Immeuble "${nomImmeuble}" ajouté`);
        setNomImmeuble("");
        setAdresse("");
        setVilleId("");
        setEtagesImmeuble("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l’ajout de l’immeuble");
      toast.error("Erreur lors de l’ajout de l’immeuble");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEtage = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (immeubleIdEtage === "" || !numeroEtage) {
      setError("Tous les champs sont obligatoires pour l’étage !");
      setIsLoading(false);
      return;
    }

    const immeuble = immeubles.find((i) => i.id === Number(immeubleIdEtage));
    if (!immeuble) {
      setError("Immeuble sélectionné invalide !");
      setIsLoading(false);
      return;
    }

    const numero = parseInt(numeroEtage);
    if (numero >= immeuble.etages) {
      setError(`Le numéro d’étage ne peut pas dépasser ${immeuble.etages - 1} !`);
      setIsLoading(false);
      return;
    }

    const newEtage: Etage = {
      id: 0,
      immeuble_id: Number(immeubleIdEtage),
      numero,
    };

    try {
      const savedEtage = await fetchWithAuth<Etage>("http://localhost:3001/etages", {
        method: "POST",
        body: JSON.stringify(newEtage),
      });
      if (savedEtage) {
        onAddEtage(savedEtage);
        toast.success(`Étage ${numeroEtage} ajouté`);
        setImmeubleIdEtage("");
        setNumeroEtage("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l’ajout de l’étage");
      toast.error("Erreur lors de l’ajout de l’étage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAppartement = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (etageId === "" || !numeroApt || !chambres || !sallesDeBain || !surface || !loyer) {
      setError("Tous les champs sont obligatoires pour l’appartement !");
      setIsLoading(false);
      return;
    }

    const parsedChambres = parseInt(chambres);
    const parsedSallesDeBain = parseInt(sallesDeBain);
    const parsedSurface = parseFloat(surface);
    const parsedLoyer = parseFloat(loyer);

    if (isNaN(parsedChambres) || parsedChambres < 0 || isNaN(parsedSallesDeBain) || parsedSallesDeBain < 0 || isNaN(parsedSurface) || parsedSurface <= 0 || isNaN(parsedLoyer) || parsedLoyer <= 0) {
      setError("Vérifiez les valeurs numériques (doivent être positives) !");
      setIsLoading(false);
      return;
    }

    const newAppartement: Appartement = {
      id: 0,
      etage_id: Number(etageId),
      numero: numeroApt,
      chambres: parsedChambres,
      sallesDeBain: parsedSallesDeBain,
      surface: parsedSurface,
      balcon,
      cuisineEquipee,
      loyer: parsedLoyer,
    };

    try {
      const savedAppartement = await fetchWithAuth<Appartement>("http://localhost:3001/appartements", {
        method: "POST",
        body: JSON.stringify(newAppartement),
      });
      if (savedAppartement) {
        onAddAppartement(savedAppartement);
        toast.success(`Appartement "${numeroApt}" ajouté`);
        setEtageId("");
        setNumeroApt("");
        setChambres("");
        setSallesDeBain("");
        setSurface("");
        setBalcon(false);
        setCuisineEquipee(false);
        setLoyer("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l’ajout de l’appartement");
      toast.error("Erreur lors de l’ajout de l’appartement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImmeuble = async (id: number, nom: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer l’immeuble "${nom}" et tous ses étages/appartements ?`)) return;

    setIsLoading(true);
    try {
      await fetchWithAuth<void>(`http://localhost:3001/biens/${id}`, { method: "DELETE" });
      onDeleteImmeuble(id);
      toast.success(`Immeuble "${nom}" supprimé`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression de l’immeuble");
      toast.error("Erreur lors de la suppression de l’immeuble");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEtage = async (id: number, numero: number) => {
    if (!confirm(`Voulez-vous vraiment supprimer l’étage ${numero} et tous ses appartements ?`)) return;

    setIsLoading(true);
    try {
      await fetchWithAuth<void>(`http://localhost:3001/etages/${id}`, { method: "DELETE" });
      onDeleteEtage(id);
      toast.success(`Étage ${numero} supprimé`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression de l’étage");
      toast.error("Erreur lors de la suppression de l’étage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAppartement = async (id: number, numero: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer l’appartement "${numero}" ?`)) return;

    setIsLoading(true);
    try {
      await fetchWithAuth<void>(`http://localhost:3001/appartements/${id}`, { method: "DELETE" });
      onDeleteAppartement(id);
      toast.success(`Appartement "${numero}" supprimé`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression de l’appartement");
      toast.error("Erreur lors de la suppression de l’appartement");
    } finally {
      setIsLoading(false);
    }
  };

  const exportAllImmeublesPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    const currentDate = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    doc.text(`Liste des Immeubles, Étages et Appartements (Généré le ${currentDate})`, 10, 10);
    let y = 25;

    immeubles.forEach((immeuble) => {
      const ville = villes.find((v) => v.id === immeuble.ville_id);
      const header = `${immeuble.nom} - ${ville?.nom || "Inconnu"}, ${ville?.pays || "Inconnu"} (${immeuble.monnaie})`;
      doc.setFontSize(12);
      doc.text(header, 10, y);
      y += 7;

      const etagesImmeuble = etages.filter((e) => e.immeuble_id === immeuble.id);
      etagesImmeuble.forEach((etage) => {
        doc.text(`  Étage ${etage.numero}`, 10, y);
        y += 7;

        const apts = appartements.filter((a) => a.etage_id === etage.id);
        apts.forEach((apt) => {
          const text = `    - ${apt.numero}: ${apt.chambres} ch., ${apt.sallesDeBain} sdb, ${apt.surface} m², ${formatMontant(apt.loyer, immeuble.monnaie)}${apt.balcon ? " (Balcon)" : ""}${apt.cuisineEquipee ? " (Cuisine équipée)" : ""}`;
          const splitText = doc.splitTextToSize(text, 180);
          splitText.forEach((line: string) => {
            if (y > 270) {
              doc.addPage();
              y = 10;
            }
            doc.text(line, 10, y);
            y += 7;
          });
        });
      });

      y += 5;
    });

    doc.save(`liste_immeubles_${currentDate}.pdf`);
    toast.success("Liste exportée en PDF avec succès");
  };

  return (
    <div className="card">
      <h2>
        <i className="fas fa-building"></i> Ajouter un Immeuble
      </h2>
      <form onSubmit={handleAddImmeuble}>
        <div>
          <label>Nom</label>
          <input
            value={nomImmeuble}
            onChange={(e) => setNomImmeuble(e.target.value)}
            placeholder="Nom de l’immeuble"
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <label>Adresse</label>
          <input
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="Adresse complète"
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <label>Ville</label>
          <select
            value={villeId}
            onChange={(e) => setVilleId(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={isLoading}
            required
          >
            <option value="">Choisir une ville</option>
            {villes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nom} ({v.pays}, {v.monnaie})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Nombre d’étages</label>
          <input
            type="number"
            min="1"
            value={etagesImmeuble}
            onChange={(e) => setEtagesImmeuble(e.target.value)}
            placeholder="Nombre d’étages"
            disabled={isLoading}
            required
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>} Ajouter
        </button>
      </form>

      <h2>
        <i className="fas fa-layer-group"></i> Ajouter un Étage
      </h2>
      <form onSubmit={handleAddEtage}>
        <div>
          <label>Immeuble</label>
          <select
            value={immeubleIdEtage}
            onChange={(e) => setImmeubleIdEtage(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={isLoading}
            required
          >
            <option value="">Choisir un immeuble</option>
            {immeubles.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Numéro d’étage</label>
          <input
            type="number"
            min="0"
            value={numeroEtage}
            onChange={(e) => setNumeroEtage(e.target.value)}
            placeholder="Ex. 1"
            disabled={isLoading}
            required
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>} Ajouter
        </button>
      </form>

      <h2>
        <i className="fas fa-home"></i> Ajouter un Appartement
      </h2>
      <form onSubmit={handleAddAppartement}>
        <div>
          <label>Étage</label>
          <select
            value={etageId}
            onChange={(e) => setEtageId(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={isLoading}
            required
          >
            <option value="">Choisir un étage</option>
            {etages.map((e) => {
              const immeuble = immeubles.find((i) => i.id === e.immeuble_id);
              return (
                <option key={e.id} value={e.id}>
                  {immeuble?.nom || "Inconnu"} - Étage {e.numero}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label>Numéro</label>
          <input
            value={numeroApt}
            onChange={(e) => setNumeroApt(e.target.value)}
            placeholder="Ex. A101"
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <label>Chambres</label>
          <input
            type="number"
            min="0"
            value={chambres}
            onChange={(e) => setChambres(e.target.value)}
            placeholder="Nombre de chambres"
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <label>Salles de bain</label>
          <input
            type="number"
            min="0"
            value={sallesDeBain}
            onChange={(e) => setSallesDeBain(e.target.value)}
            placeholder="Nombre de salles de bain"
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <label>Surface (m²)</label>
          <input
            type="number"
            min="1"
            step="0.1"
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            placeholder="Surface en m²"
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <label>Loyer</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={loyer}
            onChange={(e) => setLoyer(e.target.value)}
            placeholder="Loyer (monnaie locale)"
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={balcon}
              onChange={(e) => setBalcon(e.target.checked)}
              disabled={isLoading}
            />{" "}
            Balcon
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={cuisineEquipee}
              onChange={(e) => setCuisineEquipee(e.target.checked)}
              disabled={isLoading}
            />{" "}
            Cuisine équipée
          </label>
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>} Ajouter
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <h2>
        <i className="fas fa-list"></i> Liste des Immeubles
      </h2>
      <button onClick={exportAllImmeublesPDF} disabled={isLoading}>
        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>} Exporter tous
      </button>
      {immeubles.length === 0 ? (
        <p>Aucun immeuble enregistré.</p>
      ) : (
        <ul className="immeuble-list">
          {immeubles.map((immeuble) => {
            const ville = villes.find((v) => v.id === immeuble.ville_id);
            const etagesImmeuble = etages.filter((e) => e.immeuble_id === immeuble.id);
            return (
              <li key={immeuble.id}>
                <div className="immeuble-header">
                  <span>
                    <strong>{immeuble.nom}</strong> - {ville?.nom || "Inconnu"}, {ville?.pays || "Inconnu"} ({immeuble.monnaie})
                  </span>
                  <button onClick={() => handleDeleteImmeuble(immeuble.id, immeuble.nom)} disabled={isLoading}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
                {etagesImmeuble.length === 0 ? (
                  <p>Aucun étage pour cet immeuble.</p>
                ) : (
                  etagesImmeuble.map((etage) => (
                    <div key={etage.id} className="etage-section">
                      <div className="etage-header">
                        <span>Étage {etage.numero}</span>
                        <button onClick={() => handleDeleteEtage(etage.id, etage.numero)} disabled={isLoading}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                      <ul>
                        {appartements.filter((a) => a.etage_id === etage.id).map((apt) => (
                          <li key={apt.id}>
                            <span>
                              {apt.numero} - {apt.chambres} ch. - {apt.sallesDeBain} sdb - {apt.surface} m² -{" "}
                              {formatMontant(apt.loyer, immeuble.monnaie)}
                              {apt.balcon && " (Balcon)"}
                              {apt.cuisineEquipee && " (Cuisine équipée)"}
                            </span>
                            <button onClick={() => handleDeleteAppartement(apt.id, apt.numero)} disabled={isLoading}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}