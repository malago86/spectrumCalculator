![](public/favicon.png)

# Spencer: X-Ray Spectrum Calculator

Spencer is a specialized web-based tool designed to calculate and visualize X-ray spectra. The calculator allows users to simulate how different tube configurations and filtration materials affect the resulting X-ray fluence and energy distribution.

## Features

- **Customizable X-Ray Configuration**:
  - **Tube Potential**: Adjustable kVp range (20-49 kV).
  - **Air Kerma**: Define the incident air kerma in mGy.
  - **Anode Materials**: Support for Tungsten (W), Molybdenum (Mo), and Rhodium (Rh).
  - **Advanced Filtration**: Add multiple filtration materials with independent "Inherent" and "Added" thickness settings.

- **Multiple Data Sources**:
  Select from standard attenuation data to ensure accuracy:
  - [Hernandez et al. (2017)](https://aapm.onlinelibrary.wiley.com/doi/full/10.1002/mp.12222)
  - [Report 78](https://iopscience.iop.org/article/10.1088/0952-4746/18/1/026/meta)
  - [NIST X-Ray Tables](https://physics.nist.gov/PhysRefData/FFast/html/form.html)

- **Real-time Analysis**:
  - **Interactive Plotting**: Visualizes Inherent vs. Filtered Fluence using Plotly.js.
  - **Spectrum Metrics**: Instant calculation of Total Fluence, Average Energy, and Half Value Layer (HVL).
  - **Detailed Data**: Access a full energy-bin table for precise analysis.

- **Export & Sharing**:
  - **CSV Export**: Download the calculated spectrum for use in spreadsheets.
  - **MC-GPU Compatibility**: Export `.spc` files formatted for [MC-GPU](https://github.com/DIDSR/MCGPU) simulations.
  - **Shareable Models**: The entire configuration is stored in the URL, making it easy to share specific setups with colleagues.

## Technical Stack

- **Frontend**: [Vue 3](https://vuejs.org/) (Composition API)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Visualization**: [Plotly.js](https://plotly.com/javascript/)
- **Icons**: Material Design Icons
- **Mathematics**: Custom polynomial fitting implementation for HVL calculations.

## Usage

1. **Select Data Source**: Choose the desired attenuation data source from the top radio buttons.
2. **Configure Tube**: Set the kVp, Air Kerma, and Anode Material.
3. **Manage Filters**: Use the "+ Add filter" dropdown to add materials (e.g., Al, Be) and specify their thicknesses.
4. **Analyze**: View the generated plot and the results summary.
5. **Export**: Use the action buttons to download the data in `.csv` or `.spc` format.