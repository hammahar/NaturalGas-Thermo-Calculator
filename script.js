document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables & Initial Setup ---
    const compositionTableBody = document.querySelector('#composition-table tbody');
    let ngHeatDuty = 0; // Stores the calculated heat duty in Btu/hr

    // --- Populate Composition Table ---
    Object.keys(componentData).forEach(name => {
        if(name === "Propane") return; // Propane is refrigerant
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${name}</td>
            <td><input type="number" class="composition-input" data-component="${name}" value="0.0" step="0.01"></td>
        `;
        compositionTableBody.appendChild(row);
    });

    // --- Event Listeners ---
    document.getElementById('calculate-duty-button').addEventListener('click', calculateNaturalGasDuty);
    document.getElementById('calculate-refrigerant-button').addEventListener('click', calculateRefrigerantFlow);

    // --- Core Calculation Functions ---

    function calculateNaturalGasDuty() {
        // 1. Gather Inputs
        const inputs = getNaturalGasInputs();
        if (!inputs) return;

        // 2. Calculate Inlet and Outlet Enthalpy
        const inletState = calculateMixtureEnthalpy(inputs.tempIn, inputs.pressure, inputs.composition);
        const outletState = calculateMixtureEnthalpy(inputs.tempOut, inputs.pressure, inputs.composition);

        // 3. Calculate Enthalpy Change
        const deltaH_real = (outletState.H_total - inletState.H_total); // Btu/lbmol
        
        // 4. Calculate Heat Duty
        const totalMolarFlow = inputs.massFlow / inletState.mixtureMW; // lbmol/hr
        ngHeatDuty = deltaH_real * totalMolarFlow; // Btu/hr

        // 5. Update UI
        document.getElementById('ng-vf-inlet').textContent = inletState.Z > 0.01 ? '1.000 (Gas)' : 'Liquid/Two-Phase';
        document.getElementById('ng-vf-outlet').textContent = outletState.Z > 0.01 ? '1.000 (Gas)' : 'Liquid/Two-Phase';
        document.getElementById('heat-duty').textContent = ngHeatDuty.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    
    function calculateRefrigerantFlow() {
        if (ngHeatDuty === 0) {
            alert("Please calculate the Natural Gas Heat Duty first.");
            return;
        }

        const tempIn = parseFloat(document.getElementById('ref-temp-in').value) + 459.67; // F to R
        
        // Using Watson Equation for Latent Heat
        const propane = componentData.Propane;
        const Tr_in = tempIn / propane.Tc;
        const Tr_ref = propane.T_ref_Hvap / propane.Tc;

        const deltaH_vap = propane.Hvap_ref * Math.pow((1 - Tr_in) / (1 - Tr_ref), 0.38); // Btu/lbmol
        const delta_h_vap_mass = deltaH_vap / propane.MW; // Btu/lbm
        
        const heatToAbsorb = Math.abs(ngHeatDuty);
        const requiredMassFlow = heatToAbsorb / delta_h_vap_mass;
        
        // Update UI
        document.getElementById('refrigerant-flow').textContent = requiredMassFlow.toLocaleString('en-US', { maximumFractionDigits: 2 });
         // For simplicity, we assume refrigerant enters as saturated liquid and leaves as saturated vapor
        document.getElementById('ref-vf-inlet').textContent = "0.000 (Saturated Liquid)";
        document.getElementById('ref-vf-outlet').textContent = "1.000 (Saturated Vapor)";
    }

    function calculateMixtureEnthalpy(T, P, composition) {
        // --- Mixing Rules ---
        let mixtureMW = 0;
        let b_mix = 0;
        let a_sqrt_sum = 0;
        let deltaH_ideal_mix = 0;

        for (const [name, yi] of Object.entries(composition)) {
            const comp = componentData[name];
            mixtureMW += yi * comp.MW;

            // Ideal gas enthalpy change (simplified: integral of Cp dT from a reference T=0 R)
            deltaH_ideal_mix += yi * idealCpData[name].A * (T - 459.67); 
            
            // Peng-Robinson parameters
            const b_i = 0.07780 * R_UNIVERSAL * comp.Tc / comp.Pc;
            const kappa_i = 0.37464 + 1.54226 * comp.omega - 0.26992 * comp.omega**2;
            const Tr = T / comp.Tc;
            const alpha_i = (1 + kappa_i * (1 - Math.sqrt(Tr)))**2;
            const ac_i = 0.45724 * (R_UNIVERSAL**2 * comp.Tc**2) / comp.Pc;
            const a_i = ac_i * alpha_i;

            b_mix += yi * b_i;
            a_sqrt_sum += yi * Math.sqrt(a_i);
        }
        const a_mix = a_sqrt_sum**2;

        // --- Solve for Z ---
        const A = a_mix * P / (R_UNIVERSAL * T)**2;
        const B = b_mix * P / (R_UNIVERSAL * T);
        const Z = solveCubicZ(A, B);

        // --- Calculate Residual Enthalpy (H_residual) ---
        // This is a simplified form for demonstration. A full derivation is more complex.
        const H_residual = R_UNIVERSAL * T * (Z - 1) - (a_mix / (2.8284 * b_mix)) * Math.log((Z + 2.414 * B) / (Z - 0.414 * B));

        return {
            H_total: deltaH_ideal_mix + H_residual,
            Z: Z,
            mixtureMW: mixtureMW
        };
    }

    // --- Helper Functions ---
    function getNaturalGasInputs() {
        const massFlow = parseFloat(document.getElementById('ng-mass-flow').value);
        const tempIn = parseFloat(document.getElementById('ng-temp-in').value) + 459.67; // F to R
        const tempOut = parseFloat(document.getElementById('ng-temp-out').value) + 459.67; // F to R
        const pressure = parseFloat(document.getElementById('ng-pressure').value);
        
        const composition = {};
        let totalFraction = 0;
        document.querySelectorAll('.composition-input').forEach(input => {
            const val = parseFloat(input.value);
            if (val > 0) {
                composition[input.dataset.component] = val;
                totalFraction += val;
            }
        });

        if (Math.abs(totalFraction - 1.0) > 0.01) {
            alert("Total mole fraction must be equal to 1.0.");
            return null;
        }
        return { massFlow, tempIn, tempOut, pressure, composition };
    }

    function solveCubicZ(A, B) {
        // Numerical solver for PR EoS cubic form
        let Z = 1.0; // Initial guess for gas phase
        for (let i = 0; i < 20; i++) {
            const f = Z**3 - (1 - B) * Z**2 + (A - 3*B**2 - 2*B) * Z - (A*B - B**2 - B**3);
            const df = 3*Z**2 - 2*(1 - B)*Z + (A - 3*B**2 - 2*B);
            if (Math.abs(df) < 1e-9) break;
            const newZ = Z - f / df;
            if (Math.abs(newZ - Z) < 1e-7) {
                return newZ;
            }
            Z = newZ;
        }
        return Z;
    }
});
