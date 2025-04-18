// Interface pour les villes avec gestion de la monnaie
export interface Ville {
  id: number;
  nom: string;
  pays: string;
  monnaie: "GNF" | "XOF" | "XAF" | "EUR" | "USD";
}

// Interface pour les immeubles, liés à une ville
export interface Immeuble {
  id: number;
  nom: string;
  adresse: string;
  ville_id: number;
  etages: number;
  monnaie: "GNF" | "XOF" | "XAF" | "EUR" | "USD";
}

// Interface pour les étages, liés à un immeuble
export interface Etage {
  id: number;
  immeuble_id: number;
  numero: number;
}

// Interface pour les appartements, unités louables
export interface Appartement {
  id: number;
  etage_id: number;
  numero: string;
  chambres: number;
  sallesDeBain: number;
  surface: number;
  balcon: boolean;
  cuisineEquipee: boolean;
  loyer: number;
}

// Interface pour les locataires
export interface Locataire {
  id: number;
  nom: string;
  email?: string; // Optionnel pour éviter erreurs 2345
  telephone?: string; // Optionnel pour éviter erreurs 2345
  date_naissance?: string; // Déjà optionnel
  lieu_naissance?: string; // Optionnel pour éviter erreurs 2345
}

// Interface pour les contrats, liés à un appartement
export interface Contrat {
  id: number;
  appartement_id: number;
  locataire_id: number;
  date_debut: string;
  date_fin: string | null;
  loyer_mensuel: number;
  caution: number;
  statut?: string;
  appartement_nom?: string;
  locataire_nom?: string;
}

// Interface pour les paiements, liés à un contrat
export interface Paiement {
  id: number;
  contrat_id: number;
  montant: number;
  date_paiement: string;
  est_paye: boolean;
}

// Interface pour les impayés, liés à un locataire et appartement
export interface Impaye {
  id: number;
  contrat_id: number;
  montant: number;
  date_paiement: string;
  est_paye: boolean;
  appartement_nom?: string;
  locataire_nom?: string;
  monnaie?: string;
  immeuble_id?: number;
}

// Interface pour les statistiques mensuelles
export interface MonthlyStat {
  mois: string;
  total: number;
}

// Interface pour les utilisateurs (authentification)
export interface User {
  id: number;
  nom: string;
  email: string;
  role?: "admin" | "proprietaire"; // Optionnel pour Navbar.tsx (erreur 2322)
  token?: string;
  avatar?: string;
}

// Interface pour les fournisseurs
export interface Fournisseur {
  id: number;
  nom: string;
  contact: string;
  type_service: string;
}

// Interface pour les factures des fournisseurs
export interface FactureFournisseur {
  id: number;
  fournisseur_id: number;
  immeuble_id: number;
  montant: number;
  date_emission: string;
  date_paiement?: string;
  statut: "payee" | "non_payee";
  description?: string;
  fournisseur_nom: string;
  immeuble_nom: string;
}

// Interface pour les dépenses
export interface Depense {
  id: number;
  type: string;
  montant: number;
  date_emission: string;
  description?: string;
  statut: "non_payee" | "payee";
  date_paiement?: string;
  facture_fournisseur_id?: number;
  fournisseur_nom?: string;
  immeuble_nom?: string;
}