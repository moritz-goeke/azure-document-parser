# Azure Document Parser

A modern web application that leverages Azure Document Intelligence and OpenAI to parse and analyze documents. The application extracts text content from uploaded documents and processes it using AI to provide structured outputs based on customizable JSON formats.

## Features

- **Document Upload & Processing**: Support for PDF and other document formats
- **Azure Document Intelligence Integration**: Powerful OCR and document analysis capabilities
- **OpenAI Integration**: AI-powered content analysis and structured data extraction
- **Customizable Output Format**: Define your own JSON schema for structured results
- **Real-time Processing**: Asynchronous job processing with status updates
- **Modern React UI**: Clean, responsive interface built with Material-UI
- **Azure Functions Backend**: Serverless backend with scalable processing

## Architecture

### Frontend

- **React** with Vite for fast development and building
- **Material-UI (MUI)** for modern, accessible UI components
- **React Router** for navigation
- **Axios** for API communication

### Backend

- **Azure Functions** (Node.js) for serverless API endpoints
- **Azure Document Intelligence** for document analysis and OCR
- **OpenAI API** for AI-powered content processing
- **Azure Storage** (Blob & Queue) for job management and data persistence
- **Azure Cosmos DB** for document storage (optional)

### API Endpoints

- `POST /api/startDocumentAnalysis` - Initialize document analysis
- `GET /api/checkDocumentStatus` - Check analysis status
- `POST /api/openai/jobs` - Submit OpenAI processing job
- `GET /api/openai/jobs/{jobId}` - Check OpenAI job status

## Getting Started

### Prerequisites

- **Node.js** (v20 or later)
- **Azure CLI** (for deployment)
- **Azure Functions Core Tools** (v4)
- **Azure Subscription** with the following services:
  - Azure Document Intelligence
  - Azure Storage Account
  - Azure OpenAI Service (or OpenAI API key)

### Environment Variables

Create a `local.settings.json` file in the `backend` directory:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "your_storage_connection_string",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "DOCUMENT_INTELLIGENCE_KEY": "your_document_intelligence_key",
    "DOCUMENT_INTELLIGENCE_ENDPOINT": "your_document_intelligence_endpoint",
    "OPENAI_API_KEY": "your_openai_api_key",
    "OPENAI_ENDPOINT": "your_openai_endpoint"
  }
}
```

### Local Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd azure-document-parser
   ```

2. **Install frontend dependencies**

   ```bash
   npm install
   ```

3. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Configure Vite proxy for local development**

   Update `vite.config.js` to proxy API calls to Azure Functions:

   ```javascript
   import { defineConfig } from "vite";
   import react from "@vitejs/plugin-react";

   export default defineConfig({
     plugins: [react()],
     server: {
       proxy: {
         "/api": {
           target: "http://localhost:7071",
           changeOrigin: true,
         },
       },
     },
   });
   ```

   **Note**: In production with Azure Static Web Apps, this proxy is not needed as the Static Web App automatically routes `/api/*` requests to the linked Azure Functions.

5. **Start the backend (Azure Functions)**

   ```bash
   cd backend
   npm start
   # or use the VS Code task: "func: host start"
   # Backend will run on http://localhost:7071
   ```

6. **Start the frontend development server**

   ```bash
   npm run dev
   # Frontend will run on http://localhost:5173
   ```

7. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

### VS Code Tasks

The project includes pre-configured VS Code tasks:

- **func: host start** - Start Azure Functions backend
- **npm install (functions)** - Install backend dependencies
- **npm prune (functions)** - Clean backend dependencies

## Configuration

### Document Intelligence Setup

1. Create an Azure Document Intelligence resource in the Azure portal
2. Copy the endpoint and key to your environment variables
3. The application uses the `prebuilt-read` model by default

### OpenAI Setup

You can use either:

- **Azure OpenAI Service**: Set `OPENAI_ENDPOINT` to your Azure OpenAI endpoint
- **OpenAI API**: Set `OPENAI_API_KEY` to your OpenAI API key

### Storage Configuration

The application requires an Azure Storage Account for:

- **Blob Storage**: Storing job data and results
- **Queue Storage**: Managing asynchronous job processing

## Usage

1. **Upload a Document**: Click the upload area or drag & drop a PDF file
2. **Configure JSON Format** (Optional): Define the structure you want for the output
3. **Add Additional Context** (Optional): Provide extra instructions for AI processing
4. **Submit for Analysis**: Click "Submit" to start processing
5. **View Results**: The parsed and structured content will appear in the results section

### Example JSON Format

```json
{
  "name": "string",
  "email": "string",
  "skills": ["string"],
  "experience": [
    {
      "company": "string",
      "position": "string",
      "duration": "string"
    }
  ]
}
```

## Deployment

### Deploy to Azure Static Web Apps

Azure Static Web Apps provides the best integration for this application as it can host both the frontend and connect to Azure Functions seamlessly.

#### Step 1: Deploy the Frontend to Azure Static Web Apps

1. **Create an Azure Static Web App**

   - Go to Azure Portal → Create Resource → Static Web App
   - Connect to your GitHub repository
   - Set build details:
     - Build Presets: `Vite`
     - App location: `/` (root)
     - Output location: `dist`

2. **Configure the build**
   The GitHub Action will be automatically created. Your app will be built and deployed.

#### Step 2: Connect Azure Functions as API

1. **Create a Function App**

   ```bash
   # Create a new Function App in Azure
   az functionapp create \
     --resource-group <your-resource-group> \
     --name <your-function-app-name> \
     --storage-account <your-storage-account> \
     --consumption-plan-location <your-region> \
     --runtime node \
     --runtime-version 20 \
     --functions-version 4
   ```

2. **Deploy your Azure Functions**

   ```bash
   cd backend
   func azure functionapp publish <your-function-app-name>
   ```

3. **Link Function App to Static Web App**
   - In Azure Portal, go to your Static Web App
   - Navigate to "APIs" in the left menu
   - Click "Link" and select your Function App
   - Choose "Link an existing Function App"
   - Select your Function App from the dropdown

#### Step 3: Configure Environment Variables

1. **In your Function App** (Azure Portal → Function App → Configuration):

   ```
   DOCUMENT_INTELLIGENCE_KEY=your_key
   DOCUMENT_INTELLIGENCE_ENDPOINT=your_endpoint
   OPENAI_API_KEY=your_openai_key
   OPENAI_ENDPOINT=your_azure_openai_endpoint
   AzureWebJobsStorage=your_storage_connection_string
   ```

2. **No frontend environment variables needed** - API calls will automatically route to `/api/*` through the Static Web App integration.

### Environment Variables for Production

Ensure the following environment variables are set in your Azure Function App:

- `DOCUMENT_INTELLIGENCE_KEY`
- `DOCUMENT_INTELLIGENCE_ENDPOINT`
- `OPENAI_API_KEY` or `OPENAI_ENDPOINT`
- `AzureWebJobsStorage`

## Development

### Project Structure

```
azure-document-parser/
├── src/                    # React frontend source
│   ├── components/         # Reusable React components
│   ├── pages/             # Page components
│   ├── assets/            # Static assets (images, logos)
│   └── App.jsx            # Main app component
├── backend/               # Azure Functions backend
│   ├── src/
│   │   ├── functions/     # Function definitions
│   │   └── index.js       # Function exports
│   ├── host.json          # Functions host configuration
│   └── package.json       # Backend dependencies
├── public/                # Static public files
├── package.json           # Frontend dependencies
├── vite.config.js         # Vite configuration
└── README.md              # This file
```

### Available Scripts

**Frontend:**

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

**Backend:**

- `npm start` - Start Azure Functions locally
- `npm test` - Run tests (placeholder)

### Adding New Functions

1. Create a new file in `backend/src/functions/`
2. Export the function in `backend/src/index.js`
3. Follow the Azure Functions v4 programming model

## Related Resources

- [Azure Document Intelligence Documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/document-intelligence/)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [React Documentation](https://react.dev)
- [Material-UI Documentation](https://mui.com)

## Troubleshooting

### Common Issues

1. **Functions not starting**: Ensure Azure Functions Core Tools are installed and `local.settings.json` is configured
2. **CORS errors**: The backend is configured to allow all origins in development
3. **Document analysis fails**: Check your Document Intelligence key and endpoint
4. **OpenAI requests fail**: Verify your API key and endpoint configuration
