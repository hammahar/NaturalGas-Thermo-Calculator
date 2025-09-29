const R_UNIVERSAL = 10.73159; // Gas Constant in psia·ft³/(lbmol·°R)

const componentData = {
    "Methane": { Tc: 343.01, Pc: 667.0, omega: 0.012, MW: 16.04 },
    "Ethane": { Tc: 549.58, Pc: 706.7, omega: 0.100, MW: 30.07 },
    "Propane": { Tc: 665.70, Pc: 616.0, omega: 0.152, MW: 44.10, Hvap_ref: 15060, T_ref_Hvap: 536.67 }, // Hvap in Btu/lbmol
    "n-Butane": { Tc: 765.22, Pc: 550.6, omega: 0.200, MW: 58.12 },
    "iso-Butane": { Tc: 734.06, Pc: 527.9, omega: 0.181, MW: 58.12 },
    "n-Pentane": { Tc: 845.5, Pc: 488.8, omega: 0.252, MW: 72.15 },
    "n-Hexane": { Tc: 913.7, Pc: 438.7, omega: 0.301, MW: 86.18 },
    "Carbon Dioxide": { Tc: 547.43, Pc: 1070.0, omega: 0.224, MW: 44.01 },
    "Nitrogen": { Tc: 227.16, Pc: 492.4, omega: 0.039, MW: 28.01 }
};

// Simplified Ideal Gas Cp Data (Btu/lbmol-R) - A + BT + CT^2 + DT^3
// For a real application, you'd use more complex polynomials. This is a simplification.
const idealCpData = {
    "Methane": { A: 8.35 },
    "Ethane": { A: 12.64 },
    "Propane": { A: 17.56 },
    "n-Butane": { A: 23.51 },
    "iso-Butane": { A: 23.25 },
    "n-Pentane": { A: 28.98 },
    "n-Hexane": { A: 34.62 },
    "Carbon Dioxide": { A: 8.85 },
    "Nitrogen": { A: 6.95 }
};
