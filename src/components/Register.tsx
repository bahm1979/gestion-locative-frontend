import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "./types";

interface RegisterProps {
  setUser: (user: User | null) => void;
}

export default function Register({ setUser }: RegisterProps) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!nom || !email || !password) {
      setMessage("Erreur : Tous les champs sont requis.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setMessage("Erreur : Email invalide.");
      return;
    }
    if (password.length < 6) {
      setMessage("Erreur : Le mot de passe doit avoir au moins 6 caractères.");
      return;
    }
    try {
      const response = await fetch("http://localhost:3001/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription");
      }

      const newUser: User = {
        id: data.user.id,
        nom: data.user.nom,
        email: data.user.email,
        role: data.user.role || "proprietaire",
        token: data.token,
        avatar: data.user.avatar || undefined,
      };

      setMessage("Inscription réussie ! Vous allez être redirigé vers la connexion...");
      localStorage.setItem("token", data.token);
      setUser(newUser);
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setMessage(err.message);
      console.error("Erreur inscription:", err);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h2>
        <i className="fas fa-user-plus"></i> Inscription
      </h2>
      {message && (
        <p className={message.includes("Erreur") ? "error" : "success"}>
          <i className={message.includes("Erreur") ? "fas fa-exclamation-circle" : "fas fa-check-circle"}></i> {message}
        </p>
      )}
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
          style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ marginBottom: "10px", padding: "5px", width: "100%" }}
        />
        <button type="submit" style={{ padding: "5px 10px", width: "100%" }}>
          <i className="fas fa-user-plus"></i> S'inscrire
        </button>
      </form>
      <p style={{ marginTop: "10px", textAlign: "center" }}>
        Déjà un compte ? <a href="#" onClick={() => navigate("/login")}>Connectez-vous</a>
      </p>
    </div>
  );
}