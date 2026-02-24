// ============================================================
//  CONFIG 2026 - VARIABLES GLOBALES
// ============================================================
// Este archivo contiene las variables legales que cambian año a año.
// Para el 2027, solo se debe actualizar este archivo.

const CONFIG_APP = {
    // Valores Base 2026
    SMMLV: 1750905,
    AUX_TRANSPORTE: 249095,
    LIMIT_AUX_TRANSP: 1750905 * 2,       // 2 SMMLV
    EXONERACION_LIMIT: 1750905 * 10,     // 10 SMMLV

    // Tasas Seguridad Social (empresa)
    PENSION: 0.12,
    SALUD: 0.085,

    // Tasas ARL por nivel de riesgo
    ARL: {
        1: 0.00522,
        2: 0.01044,
        3: 0.02436,
        4: 0.04350,
        5: 0.06700
    },

    // Tasas Prestaciones Sociales
    PRIMA: 0.0833,
    CESANTIAS: 0.0833,
    INT_CESANTIAS: 0.12,   // sobre el valor de cesantías
    VACACIONES: 0.0417,

    // Tasas Parafiscales
    CAJA: 0.04,
    SENA: 0.02,
    ICBF: 0.03,

    // Datos Empresa (Para Reportes/PDF)
    COMPANY_NAME: "AdsHouse Agencia",
    COMPANY_LOGO: "https://via.placeholder.com/150x50/8B5CF6/FFFFFF?text=AdsHouse",

    // Supabase
    SUPABASE_URL: "https://kkcpfwfvsiwruovluffd.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrY3Bmd2Z2c2l3cnVvdmx1ZmZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMzY2MDksImV4cCI6MjA4MjgxMjYwOX0.eX8N5nUSZWKsVLt2HqgKYUpwxRjsn_5j95zutM_Ovgg"
};
