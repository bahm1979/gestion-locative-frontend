// frontend/src/components/FournisseurList.tsx
import { useState, useEffect } from 'react';
import { Fournisseur } from './types'; // Ajoute ce type dans types.ts

interface FournisseurListProps {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<any>;
}

const FournisseurList = ({ fetchWithAuth }: FournisseurListProps) => {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [nom, setNom] = useState('');
  const [contact, setContact] = useState('');
  const [typeService, setTypeService] = useState('');

  useEffect(() => {
    const fetchFournisseurs = async () => {
      try {
        const data = await fetchWithAuth('http://localhost:3001/fournisseurs');
        setFournisseurs(data || []);
      } catch (err) {
        console.error('Erreur lors de la récupération des fournisseurs:', err);
      }
    };
    fetchFournisseurs();
  }, [fetchWithAuth]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetchWithAuth('http://localhost:3001/fournisseurs', {
        method: 'POST',
        body: JSON.stringify({ nom, contact, type_service: typeService }),
      });
      setFournisseurs([...fournisseurs, { id: response.id, nom, contact, type_service: typeService }]);
      setNom('');
      setContact('');
      setTypeService('');
    } catch (err) {
      console.error('Erreur lors de l’ajout du fournisseur:', err);
    }
  };

  return (
    <div className="container">
      <h2>Fournisseurs</h2>
      <form onSubmit={handleSubmit}>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" required />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact" />
        <input value={typeService} onChange={(e) => setTypeService(e.target.value)} placeholder="Type de service" />
        <button type="submit">Ajouter</button>
      </form>
      <ul>
        {fournisseurs.map((f) => (
          <li key={f.id}>{f.nom} - {f.type_service} ({f.contact})</li>
        ))}
      </ul>
    </div>
  );
};

export default FournisseurList;