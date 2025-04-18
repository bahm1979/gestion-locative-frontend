// frontend/src/components/FactureFournisseurList.tsx
import { useState, useEffect } from 'react';
import { FactureFournisseur, Fournisseur, Immeuble } from './types';
import jsPDF from 'jspdf';

interface FactureFournisseurListProps {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<any>;
}

// Fonction pour formater les dates
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Fonction pour formater le montant
const formatMontant = (montant: number) => {
  const formatted = Math.round(montant).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} GNF`;
};

const FactureFournisseurList = ({ fetchWithAuth }: FactureFournisseurListProps) => {
  const [factures, setFactures] = useState<FactureFournisseur[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [formData, setFormData] = useState({
    fournisseur_id: '',
    immeuble_id: '',
    montant: '',
    date_emission: '',
    description: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [facturesData, fournisseursData, immeublesData] = await Promise.all([
          fetchWithAuth('http://localhost:3001/factures-fournisseurs'),
          fetchWithAuth('http://localhost:3001/fournisseurs'),
          fetchWithAuth('http://localhost:3001/biens'),
        ]);
        setFactures(facturesData || []);
        setFournisseurs(fournisseursData || []);
        setImmeubles(immeublesData || []);
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
      }
    };
    fetchData();
  }, [fetchWithAuth]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetchWithAuth('http://localhost:3001/factures-fournisseurs', {
        method: 'POST',
        body: JSON.stringify({
          fournisseur_id: parseInt(formData.fournisseur_id),
          immeuble_id: parseInt(formData.immeuble_id),
          montant: parseFloat(formData.montant),
          date_emission: formData.date_emission,
          description: formData.description,
        }),
      });
      const newFacture = {
        ...response,
        fournisseur_nom: fournisseurs.find(f => f.id === parseInt(formData.fournisseur_id))?.nom,
        immeuble_nom: immeubles.find(i => i.id === parseInt(formData.immeuble_id))?.nom,
      };
      setFactures([...factures, newFacture]);
      setFormData({ fournisseur_id: '', immeuble_id: '', montant: '', date_emission: '', description: '' });
    } catch (err) {
      console.error('Erreur lors de l’ajout de la facture:', err);
    }
  };

  const handlePayer = async (id: number) => {
    try {
      await fetchWithAuth(`http://localhost:3001/factures-fournisseurs/${id}/payer`, {
        method: 'PUT',
        body: JSON.stringify({ date_paiement: new Date().toISOString().split('T')[0] }),
      });
      setFactures(factures.map(f => f.id === id ? { ...f, statut: 'payee', date_paiement: new Date().toISOString().split('T')[0] } : f));
    } catch (err) {
      console.error('Erreur lors du paiement:', err);
    }
  };

  const handleSupprimer = async (id: number) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette facture ?')) {
      try {
        await fetchWithAuth(`http://localhost:3001/factures-fournisseurs/${id}`, {
          method: 'DELETE',
        });
        setFactures(factures.filter(f => f.id !== id));
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
      }
    }
  };

  const handleDownload = (facture: FactureFournisseur) => {
    const doc = new jsPDF();
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = margin;

    // En-tête
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('FACTURE', pageWidth / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(12);
    doc.text(`N° ${facture.id}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Ligne de séparation
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Informations Fournisseur
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Fournisseur:', margin, y);
    doc.text(facture.fournisseur_nom, margin + 40, y);
    y += 7;

    // Informations Immeuble
    doc.text('Immeuble:', margin, y);
    doc.text(facture.immeuble_nom, margin + 40, y);
    y += 10;

    // Détails Facture
    doc.setFont('helvetica', 'bold');
    doc.text('Détails de la Facture', margin, y);
    y += 5;
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Montant: ${formatMontant(facture.montant)}`, margin, y);
    y += 7;
    doc.text(`Date d’émission: ${formatDate(facture.date_emission)}`, margin, y);
    y += 7;
    doc.text(`Statut: ${facture.statut === 'payee' ? 'Payée' : 'Non payée'}`, margin, y);
    if (facture.statut === 'payee' && facture.date_paiement) {
      y += 7;
      doc.text(`Date de paiement: ${formatDate(facture.date_paiement)}`, margin, y);
    }
    y += 7;
    if (facture.description) {
      doc.text('Description:', margin, y);
      doc.text(facture.description, margin + 40, y, { maxWidth: pageWidth - margin - 40 });
    }

    // Pied de page
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${formatDate(new Date().toISOString())}`, margin, doc.internal.pageSize.getHeight() - margin);

    // Sauvegarde
    doc.save(`Facture_${facture.id}_${facture.fournisseur_nom.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="container">
      <h2>Factures Fournisseurs</h2>

      {/* Formulaire d'ajout */}
      <form onSubmit={handleSubmit} className="facture-form">
        <select
          name="fournisseur_id"
          value={formData.fournisseur_id}
          onChange={handleInputChange}
          required
        >
          <option value="">Sélectionner un fournisseur</option>
          {fournisseurs.map((f) => (
            <option key={f.id} value={f.id}>{f.nom}</option>
          ))}
        </select>
        <select
          name="immeuble_id"
          value={formData.immeuble_id}
          onChange={handleInputChange}
          required
        >
          <option value="">Sélectionner un immeuble</option>
          {immeubles.map((i) => (
            <option key={i.id} value={i.id}>{i.nom}</option>
          ))}
        </select>
        <input
          type="number"
          name="montant"
          value={formData.montant}
          onChange={handleInputChange}
          placeholder="Montant (GNF)"
          required
        />
        <input
          type="date"
          name="date_emission"
          value={formData.date_emission}
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Description (optionnel)"
        />
        <button type="submit">Ajouter Facture</button>
      </form>

      {/* Liste des factures */}
      <table className="facture-table">
        <thead>
          <tr>
            <th>Fournisseur</th>
            <th>Immeuble</th>
            <th>Montant</th>
            <th>Date Émission</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {factures.map((f) => (
            <tr key={f.id}>
              <td>{f.fournisseur_nom}</td>
              <td>{f.immeuble_nom}</td>
              <td>{f.montant.toLocaleString('fr-FR')} GNF</td>
              <td>{formatDate(f.date_emission)}</td>
              <td>{f.statut === 'payee' ? 'Payée' : 'Non payée'}</td>
              <td>
                {f.statut === 'non_payee' && (
                  <button onClick={() => handlePayer(f.id)}>Marquer comme payée</button>
                )}
                <button onClick={() => handleSupprimer(f.id)}>Supprimer</button>
                <button onClick={() => handleDownload(f)}>Télécharger</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FactureFournisseurList;