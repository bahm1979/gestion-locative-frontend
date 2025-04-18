import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { toast } from "react-toastify";

interface User {
  id: number;
  nom: string;
  email: string;
  role: "admin" | "proprietaire";
  token: string;
  avatar?: string;
}

interface ProfileUpdateProps {
  setUser: (user: User | null) => void;
}

export default function ProfileUpdate({ setUser }: ProfileUpdateProps) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Utilisateur non authentifié.");
        toast.error("Session expirée.");
        return;
      }

      try {
        const res = await fetch("http://localhost:3001/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
        const data = await res.json();
        console.log("Données initiales chargées:", data);
        setNom(data.nom || "");
        setEmail(data.email || "");
        setAvatarPreview(data.avatar ? `http://localhost:3001${data.avatar}` : null);
      } catch (err) {
        setError("Impossible de charger les données.");
        toast.error("Erreur lors du chargement.");
      }
    };
    fetchUserData();
  }, []);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Aucun token trouvé.");
      toast.error("Session expirée.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("nom", nom.trim());
    formData.append("email", email.trim());
    if (avatarFile) formData.append("avatar", avatarFile);

    console.log("Données envoyées au backend:", { nom, email, avatarFile });

    try {
      const res = await fetch("http://localhost:3001/auth/update-profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      console.log("Statut de la réponse:", res.status, res.statusText);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Erreur HTTP ${res.status}`);
      }

      const updatedUser = await res.json();
      console.log("Réponse du backend:", updatedUser);

      // Mettre à jour l’état global
      setUser({ ...updatedUser, token });
      localStorage.setItem("user", JSON.stringify(updatedUser)); // Optionnel

      // Réinitialiser les champs locaux pour refléter la mise à jour
      setNom(updatedUser.nom);
      setEmail(updatedUser.email);
      setAvatarPreview(updatedUser.avatar ? `http://localhost:3001${updatedUser.avatar}` : null);
      setAvatarFile(null);

      toast.success("Profil mis à jour avec succès !");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue.";
      console.error("Erreur lors de la mise à jour:", err);
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card profile-card">
      <h2>
        <i className="fas fa-user-edit"></i> Mettre à jour le profil
      </h2>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        {avatarPreview && (
          <div className="avatar-preview">
            <img src={avatarPreview} alt="Prévisualisation" className="avatar" />
          </div>
        )}
        <div>
          <label htmlFor="nom">Nom</label>
          <input
            id="nom"
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Entrez votre nom"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Entrez votre email"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="avatar">Avatar</label>
          <input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            disabled={isLoading}
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <>
              <i className="fas fa-save"></i> Sauvegarder
            </>
          )}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}