// Utilitários de validação
(function() {
    'use strict';
    
    // Namespace global
    window.SimuladorSplitPayment = window.SimuladorSplitPayment || {};
    
    // Validar número
    function validarNumero(valor, min = null, max = null) {
        const num = parseFloat(valor);
        
        if (isNaN(num)) {
            return false;
        }
        
        if (min !== null && num < min) {
            return false;
        }
        
        if (max !== null && num > max) {
            return false;
        }
        
        return true;
    }
    
    // Validar percentual
    function validarPercentual(valor, permitirNegativo = false) {
        const num = parseFloat(valor);
        
        if (isNaN(num)) {
            return false;
        }
        
        if (!permitirNegativo && num < 0) {
            return false;
        }
        
        return true;
    }
    
    // Validar campo requerido
    function validarCampoRequerido(valor) {
        if (valor === null || valor === undefined) {
            return false;
        }
        
        if (typeof valor === 'string') {
            return valor.trim() !== '';
        }
        
        return true;
    }
    
    // Validar sequência de campos
    function validarSequencia(valores, validador) {
        if (!Array.isArray(valores)) {
            return false;
        }
        
        return valores.every(valor => validador(valor));
    }
    
    // Exportar funções
    SimuladorSplitPayment.validators = {
        validarNumero: validarNumero,
        validarPercentual: validarPercentual,
        validarCampoRequerido: validarCampoRequerido,
        validarSequencia: validarSequencia
    };
})();
