import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { User, Impaye, Immeuble } from "./types";

interface NavbarProps {
  user: User;
  impayes: Impaye[];
  immeubles: Immeuble[];
  setUser: (user: User | null) => void;
}

export default function Navbar({ user, impayes, setUser }: NavbarProps) {
  const [showModal, setShowModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setShowUserMenu(false);
    navigate("/login");
  };

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = "https://placehold.co/40x40?text=U";
  };

  const formatMontant = (montant: number, monnaie: string = "GNF") => {
    try {
      return montant.toLocaleString("fr-FR", { style: "currency", currency: monnaie });
    } catch {
      return `${montant.toFixed(2)} ${monnaie}`;
    }
  };

  const handleImpayeClick = (impayeId: number) => {
    setShowModal(false);
    navigate(`/paiements/${impayeId}`);
  };

  const userRole = user.role || "proprietaire";

  return (
    <nav className="navbar" role="navigation" aria-label="Menu principal">
      <ul>
        <li>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-chart-line"></i> Tableau de bord
          </NavLink>
        </li>
        <li>
          <NavLink to="/immeubles" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-home"></i> Immeubles
          </NavLink>
        </li>
        <li>
          <NavLink to="/locataires" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-users"></i> Locataires
          </NavLink>
        </li>
        <li>
          <NavLink to="/paiements" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-money-bill"></i> Paiements
          </NavLink>
        </li>
        <li>
          <NavLink to="/contrats" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-file-contract"></i> Contrats
          </NavLink>
        </li>
        <li>
          <NavLink to="/fournisseurs" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-tools"></i> Fournisseurs
          </NavLink>
        </li>
        <li>
          <NavLink to="/factures-fournisseurs" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-file-invoice"></i> Factures Fournisseurs
          </NavLink>
        </li>
        <li>
          <NavLink to="/comptabilite" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fas fa-calculator"></i> Comptabilité
          </NavLink>
        </li>
        {userRole === "admin" && (
          <li>
            <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>
              <i className="fas fa-user-shield"></i> Admin
            </NavLink>
          </li>
        )}
      </ul>

      {impayes.length > 0 && (
        <span
          className="notification-badge"
          onClick={() => setShowModal(true)}
          role="button"
          tabIndex={0}
          aria-label={`Voir ${impayes.length} impayés`}
          onKeyDown={(e) => e.key === "Enter" && setShowModal(true)}
        >
          {impayes.length}
        </span>
      )}

      <div className="user-menu" ref={userMenuRef}>
        <button
          className="user-icon"
          onClick={() => setShowUserMenu(!showUserMenu)}
          aria-label={`Menu de ${user.nom}`}
          aria-expanded={showUserMenu}
        >
          <img
            src={user.avatar ? `http://localhost:3001${user.avatar}` : "https://placehold.co/40x40?text=U"}
            alt={user.nom}
            className="avatar"
            onError={handleAvatarError}
          />
        </button>
        {showUserMenu && (
          <div className="user-dropdown animate-dropdown" role="menu">
            <p className="user-info">
              <i className="fas fa-user"></i> <strong>{user.nom}</strong>
            </p>
            <p className="user-email">{user.email}</p>
            <p className="user-role">
              {userRole === "admin" ? "Administrateur" : "Propriétaire"}
            </p>
            <NavLink
              to="/profile"
              className="profile-link"
              onClick={() => setShowUserMenu(false)}
              role="menuitem"
            >
              <i className="fas fa-user-edit"></i> Modifier le profil
            </NavLink>
            <button
              className="logout-btn"
              onClick={handleLogout}
              aria-label="Déconnexion"
              role="menuitem"
            >
              <i className="fas fa-sign-out-alt"></i> Déconnexion
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal animate-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <h3>
              <i className="fas fa-exclamation-triangle"></i> Liste des impayés ({impayes.length})
            </h3>
            {impayes.length > 0 ? (
              <ul className="impayes-list">
                {impayes.map((impaye) => (
                  <li
                    key={impaye.id}
                    className="impaye-item"
                    onClick={() => handleImpayeClick(impaye.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleImpayeClick(impaye.id)}
                    aria-label={`Voir les détails de l’impayé de ${impaye.locataire_nom || "Locataire inconnu"}`}
                  >
                    <span className="impaye-details">
                      <strong>{impaye.locataire_nom || "Locataire inconnu"}</strong> -{" "}
                      {impaye.appartement_nom || "Appartement inconnu"}
                    </span>
                    <span className="impaye-amount">
                      {formatMontant(impaye.montant, impaye.monnaie || "GNF")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Aucun impayé à afficher.</p>
            )}
            <button className="modal-close-btn" onClick={() => setShowModal(false)}>
              <i className="fas fa-times"></i> Fermer
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}