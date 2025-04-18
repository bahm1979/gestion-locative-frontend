import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

interface User {
  id: number;
  nom: string;
  email: string;
  role: "admin" | "proprietaire";
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:3001/admin/users", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        if (!res.ok) throw new Error("Échec du chargement des utilisateurs");

        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError("Impossible de récupérer les utilisateurs.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleRoleChange = async (id: number, newRole: "admin" | "proprietaire") => {
    try {
      const res = await fetch(`http://localhost:3001/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error("Échec de la mise à jour du rôle");

      setUsers(users.map(user => (user.id === id ? { ...user, role: newRole } : user)));
    } catch (err) {
      console.error("Erreur mise à jour du rôle :", err);
      setError("Échec de la mise à jour du rôle.");
    }
  };

  return (
    <div className="admin-panel">
      <h2>🎛️ Panneau d'Administration</h2>

      {loading && <p>Chargement des utilisateurs...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && users.length === 0 && <p>Aucun utilisateur trouvé.</p>}

      {!loading && users.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.nom}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  {user.role !== "admin" ? (
                    <button onClick={() => handleRoleChange(user.id, "admin")}>🔼 Promouvoir Admin</button>
                  ) : (
                    <button onClick={() => handleRoleChange(user.id, "proprietaire")}>🔽 Rétrograder</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className="back-btn" onClick={() => navigate("/dashboard")}>⬅️ Retour au Dashboard</button>
    </div>
  );
}
