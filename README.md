# Optellix Assignment

This project is a 3D visualization tool for orthopedic pre-operative planning, focusing on femur and tibia bone models.

## Features

- Interactive 3D bone model visualization
- Placement of anatomical landmarks
- Generation of reference planes and lines
- Varus/Valgus and Flexion/Extension angle adjustments
- Distal resection simulation

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (version 12.0 or later)
- npm (usually comes with Node.js)

### Installation

1. Clone the repository:
2. Navigate to the project directory:
3. Install dependencies:
### Running the Application

To run the application locally, use the following command:
This will start the development server. Open your browser and navigate to `http://localhost:3000` (or the port specified in the console output) to view the application.

## Usage

1. Use the left sidebar to select anatomical landmarks.
2. Click on the 3D bone model to place the selected landmarks.
3. After placing all required landmarks, click the "Update" button to generate reference planes and lines.
4. Use the right sidebar to adjust Varus/Valgus and Flexion/Extension angles.
5. Toggle the "Resection" switch to activate the distal resection simulation.
6. Adjust the distal resection distance using the controls in the right sidebar.

Note: When resection is toggled on, the bone model will be sliced along the distal resection plane.

