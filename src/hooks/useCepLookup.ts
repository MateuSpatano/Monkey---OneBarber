import { useState } from 'react';
import { toast } from 'sonner';

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

/** Endereço normalizado retornado pelo hook */
export interface CepAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export function useCepLookup() {
  const [loading, setLoading] = useState(false);

  /**
   * API primária — retorna os dados do endereço ou null.
   * Usada por ClientModal e PersonalInfoTab.
   */
  const lookupCep = async (cep: string): Promise<CepAddress | null> => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return null;

    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data: ViaCepResponse = await res.json();

      if (data.erro) {
        toast.error('CEP não encontrado. Verifique os números e tente novamente.');
        return null;
      }

      toast.success('Endereço preenchido automaticamente!');
      return {
        street:       data.logradouro,
        neighborhood: data.bairro,
        city:         data.localidade,
        state:        data.uf,
      };
    } catch {
      toast.error('Erro ao buscar o CEP. Tente preencher manualmente.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * API de compatibilidade — recebe um setter genérico e chama com os campos
   * usando os nomes do react-hook-form ('rua', 'bairro', 'cidade', 'estado').
   * Usada por EstablishmentModal (que adapta os nomes internamente).
   */
  const buscarCep = async (
    cep: string,
    setValue: (field: string, value: string, options?: object) => void
  ): Promise<void> => {
    const address = await lookupCep(cep);
    if (!address) return;

    setValue('rua',    address.street,       { shouldValidate: true });
    setValue('bairro', address.neighborhood, { shouldValidate: true });
    setValue('cidade', address.city,         { shouldValidate: true });
    setValue('estado', address.state,        { shouldValidate: true });
  };

  return {
    lookupCep,
    buscarCep,
    loading,
    isLoadingCep: loading, // alias para EstablishmentModal
  };
}
