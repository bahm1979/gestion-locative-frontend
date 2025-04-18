import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import ImmeubleList from "./components/ImmeubleList";
import LocataireList from "./components/LocataireList";
import PaiementList from "./components/PaiementList";
import ContratList from "./components/ContratList";
import Dashboard from "./components/Dashboard";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPanel from "./components/AdminPanel";
import ProfileUpdate from "./components/ProfileUpdate";
import FournisseurList from "./components/FournisseurList";
import FactureFournisseurList from "./components/FactureFournisseurList";
import Comptabilite from "./components/Comptabilite";
import { Ville, Immeuble, Etage, Appartement, Locataire, Paiement, Contrat, Impaye, MonthlyStat, User, FactureFournisseur, Depense } from "./components/types";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [etages, setEtages] = useState<Etage[]>([]);
  const [appartements, setAppartements] = useState<Appartement[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [facturesFournisseurs, setFacturesFournisseurs] = useState<FactureFournisseur[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [isDark, setIsDark] = useState<boolean>(() => localStorage.getItem("theme") === "dark");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
    document.body.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("token");
    toast.info("Déconnexion réussie");
    navigate("/login");
  }, [navigate]);

  const fetchWithAuth = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem("token");
    if (!token) {
      handleLogout();
      throw new Error("Aucun token d'authentification trouvé");
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        if (res.status === 401) {
          handleLogout();
          throw new Error("Session expirée, veuillez vous reconnecter");
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${res.status}`);
      }
      if (res.status === 204) {
        return {} as T; // Retourner un objet vide pour 204
      }
      return await res.json();
    } catch (err) {
      console.error(`Erreur API sur ${url}:`, err);
      throw err;
    }
  };

  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await fetchWithAuth<User>("http://localhost:3001/auth/me");
        setUser({ ...data, token, role: data.role || "proprietaire" });
      } catch (err) {
        handleLogout();
        setError("Erreur lors de la vérification de l’utilisateur.");
        toast.error("Session invalide, veuillez vous reconnecter");
      } finally {
        setIsLoading(false);
      }
    };
    initializeUser();
  }, [handleLogout]);

  const fetchData = useCallback(async () => {
    if (!user?.token) return;

    setIsLoading(true);
    setError(null);
    try {
      const [
        villesData,
        immeublesData,
        etagesData,
        appartementsData,
        locatairesData,
        paiementsData,
        contratsData,
        monthlyStatsData,
        facturesFournisseursData,
        depensesData,
      ] = await Promise.all([
        fetchWithAuth<Ville[]>("http://localhost:3001/villes"),
        fetchWithAuth<Immeuble[]>("http://localhost:3001/biens"),
        fetchWithAuth<Etage[]>("http://localhost:3001/etages"),
        fetchWithAuth<Appartement[]>("http://localhost:3001/appartements"),
        fetchWithAuth<Locataire[]>("http://localhost:3001/locataires"),
        fetchWithAuth<Paiement[]>("http://localhost:3001/paiements"),
        fetchWithAuth<Contrat[]>("http://localhost:3001/contrats"),
        fetchWithAuth<MonthlyStat[]>("http://localhost:3001/paiements/stats"),
        fetchWithAuth<FactureFournisseur[]>("http://localhost:3001/factures-fournisseurs"),
        fetchWithAuth<Depense[]>("http://localhost:3001/depenses"),
      ]);

      setVilles(villesData);
      setImmeubles(immeublesData);
      setEtages(etagesData);
      setAppartements(appartementsData);
      setLocataires(
        locatairesData.map((l: Locataire) => ({
          ...l,
          email: l.email || undefined,
          telephone: l.telephone || undefined,
          date_naissance: l.date_naissance || undefined,
          lieu_naissance: l.lieu_naissance || undefined,
        }))
      );
      setFacturesFournisseurs(facturesFournisseursData);
      setDepenses(depensesData);
      setPaiements(
        paiementsData.map((p: Paiement) => ({
          ...p,
          montant: typeof p.montant === "string" ? parseFloat(p.montant) : p.montant,
        }))
      );
      setContrats(contratsData);
      setMonthlyStats(monthlyStatsData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(`Erreur lors du chargement des données : ${errorMsg}`);
      toast.error(`Erreur lors du chargement des données : ${errorMsg}`);
      console.error("Erreur fetchData:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddImmeuble = async (newImmeuble: Immeuble) => {
    setImmeubles((prev) => [...prev, newImmeuble]);
    await fetchData();
  };

  const handleAddEtage = async (newEtage: Etage) => {
    setEtages((prev) => [...prev, newEtage]);
    await fetchData();
  };

  const handleAddAppartement = async (newAppartement: Appartement) => {
    setAppartements((prev) => [...prev, newAppartement]);
    await fetchData();
  };

  const handleDeleteImmeuble = async (id: number) => {
    setImmeubles((prev) => prev.filter((i) => i.id !== id));
    setEtages((prev) => prev.filter((e) => e.immeuble_id !== id));
    setAppartements((prev) => prev.filter((a) => !etages.some((e) => e.immeuble_id === id && e.id === a.etage_id)));
    await fetchData();
  };

  const handleDeleteEtage = async (id: number) => {
    setEtages((prev) => prev.filter((e) => e.id !== id));
    setAppartements((prev) => prev.filter((a) => a.etage_id !== id));
    await fetchData();
  };

  const handleDeleteAppartement = async (id: number) => {
    setAppartements((prev) => prev.filter((a) => a.id !== id));
    await fetchData();
  };

  const calculatedImpayes: Impaye[] = paiements
    .filter((p) => !p.est_paye)
    .map((p) => {
      const contrat = contrats.find((c) => c.id === p.contrat_id);
      const appartement = appartements.find((a) => a.id === contrat?.appartement_id);
      const locataire = locataires.find((l) => l.id === contrat?.locataire_id);
      return {
        id: p.id,
        contrat_id: p.contrat_id,
        montant: p.montant,
        date_paiement: p.date_paiement,
        est_paye: p.est_paye,
        appartement_nom: appartement?.numero || "Inconnu",
        locataire_nom: locataire?.nom || "Inconnu",
        monnaie: immeubles.find((i) => i.id === appartement?.etage_id)?.monnaie || "GNF",
      };
    });

  const renderLoadingOrError = () => (
    <div className="status-container">
      {isLoading && (
        <p className="loading">
          <i className="fas fa-spinner fa-spin"></i> Chargement...
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );

  return (
    <div className={`container ${isDark ? "dark-mode" : ""}`}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      {renderLoadingOrError()}
      {user && (
        <>
          <button
            className="theme-toggle"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label={isDark ? "Passer au mode clair" : "Passer au mode sombre"}
          >
            <i className={isDark ? "fas fa-sun" : "fas fa-moon"}></i>
          </button>
          <Navbar user={user} impayes={calculatedImpayes} immeubles={immeubles} setUser={setUser} />
        </>
      )}
      <Routes>
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register setUser={setUser} /> : <Navigate to="/" />} />
        <Route
          path="/"
          element={
            user ? (
              <Dashboard
                immeubles={immeubles}
                appartements={appartements}
                etages={etages}
                paiements={paiements}
                monthlyStats={monthlyStats}
                contrats={contrats}
                locataires={locataires}
                facturesFournisseurs={facturesFournisseurs}
                fetchWithAuth={fetchWithAuth}
                setImmeubles={setImmeubles}
                setAppartements={setAppartements}
                setEtages={setEtages}
                setPaiements={setPaiements}
                setMonthlyStats={setMonthlyStats}
                setContrats={setContrats}
                setLocataires={setLocataires}
                setFacturesFournisseurs={setFacturesFournisseurs}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/immeubles"
          element={
            user ? (
              <ImmeubleList
                immeubles={immeubles}
                etages={etages}
                appartements={appartements}
                villes={villes}
                onAddImmeuble={handleAddImmeuble}
                onAddEtage={handleAddEtage}
                onAddAppartement={handleAddAppartement}
                onDeleteImmeuble={handleDeleteImmeuble}
                onDeleteEtage={handleDeleteEtage}
                onDeleteAppartement={handleDeleteAppartement}
                fetchWithAuth={fetchWithAuth}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/locataires"
          element={
            user ? (
              <LocataireList
                locataires={locataires}
                onAdd={(newLocataire: Locataire) => setLocataires((prev) => [...prev, newLocataire])}
                onDelete={(id: number) => setLocataires((prev) => prev.filter((l) => l.id !== id))}
                onUpdate={(updatedLocataire: Locataire) =>
                  setLocataires((prev) =>
                    prev.map((l) => (l.id === updatedLocataire.id ? updatedLocataire : l))
                  )
                }
                fetchWithAuth={fetchWithAuth}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/paiements"
          element={
            user ? (
              <PaiementList
                paiements={paiements}
                locataires={locataires}
                appartements={appartements}
                contrats={contrats}
                onAdd={(newPaiement) => setPaiements((prev) => [...prev, newPaiement])}
                onUpdate={(updatedPaiement) =>
                  setPaiements((prev) => prev.map((p) => (p.id === updatedPaiement.id ? updatedPaiement : p)))
                }
                fetchWithAuth={fetchWithAuth}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/contrats"
          element={
            user ? (
              <ContratList
                contrats={contrats}
                appartements={appartements}
                locataires={locataires}
                onAdd={(newContrat) => setContrats((prev) => [...prev, newContrat])}
                onDelete={(id) => setContrats((prev) => prev.filter((c) => c.id !== id))}
                onUpdate={(updatedContrat) =>
                  setContrats((prev) => prev.map((c) => (c.id === updatedContrat.id ? updatedContrat : c)))
                }
                fetchWithAuth={fetchWithAuth}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/fournisseurs"
          element={user ? <FournisseurList fetchWithAuth={fetchWithAuth} /> : <Navigate to="/login" />}
        />
        <Route
          path="/factures-fournisseurs"
          element={user ? <FactureFournisseurList fetchWithAuth={fetchWithAuth} /> : <Navigate to="/login" />}
        />
        <Route
          path="/comptabilite"
          element={
            user ? (
              <Comptabilite
                paiements={paiements}
                depenses={depenses}
                fetchWithAuth={fetchWithAuth}
                setDepenses={setDepenses}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]} element={<AdminPanel />} />} />
        <Route
          path="/profile"
          element={user ? <ProfileUpdate setUser={setUser} /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </div>
  );
}