import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { User } from "./types";

const API_URL = import.meta.env.VITE_API_URL; // 👈 ici la variable dynamique


interface LoginProps {
  setUser: (user: User) => void;
}

export default function Login({ setUser }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email.includes("@") || password.length < 6) {
      setError("Veuillez entrer un email valide et un mot de passe d’au moins 6 caractères.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });

      const data = res.data;

      if (!data.token || !data.user) {
        throw new Error("Réponse invalide : token ou utilisateur manquant");
      }

      const newUser: User = {
        id: data.user.id,
        nom: data.user.nom,
        email: data.user.email,
        role: data.user.role || "proprietaire",
        token: data.token,
        avatar: data.user.avatar || undefined,
      };

      setUser(newUser);
      localStorage.setItem("token", data.token);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur réseau : impossible de contacter le serveur");
      console.error("Erreur détaillée:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>
        <i className="fas fa-lock"></i> Connexion
      </h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input
            type="email"
            placeholder="exemple@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label>Mot de passe</label>
          <input
            type="password"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-in-alt"></i>} Se connecter
        </button>
      </form>
      {error && (
        <p className="error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </p>
      )}
      <p>
        Pas encore de compte ? <Link to="/register">Inscrivez-vous ici</Link>
      </p>
    </div>
  );
}