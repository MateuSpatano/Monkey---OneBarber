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

export function useCepLookup() {
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // O parâmetro 'setValue' vem do react-hook-form para preencher os inputs
  const buscarCep = async (cep: string, setValue: any) => {
    // Limpa a string, mantendo apenas números
    const cepLimpo = cep.replace(/\D/g, '');

    // Verifica se tem os 8 dígitos necessários
    if (cepLimpo.length !== 8) return;

    setIsLoadingCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado. Verifique os números e tente novamente.');
        return;
      }

      // Preenche automaticamente os inputs do formulário.
      // Certifique-se de que o nome ('name') dos seus inputs seja igual aos primeiros parâmetros abaixo:
      setValue('rua', data.logradouro, { shouldValidate: true });
      setValue('bairro', data.bairro, { shouldValidate: true });
      setValue('cidade', data.localidade, { shouldValidate: true });
      setValue('estado', data.uf, { shouldValidate: true });
      
      toast.success('Endereço preenchido automaticamente!');

    } catch (error) {
      toast.error('Erro ao buscar o CEP. Tente preencher manualmente.');
    } finally {
      setIsLoadingCep(false);
    }
  };

  return { buscarCep, isLoadingCep };
}