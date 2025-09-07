# Azure Document Parser

A modern web application that leverages Azure Document Intelligence and Azure OpenAI to parse and analyze documents. The application extracts text content from uploaded documents and processes it using AI to provide structured outputs based on customizable JSON formats.

## Features

- **Document Upload & Processing**: Support for PDF and other document formats
- **Azure Document Intelligence Integration**: Powerful OCR and document analysis capabilities
- **Azure OpenAI Integration**: AI-powered content analysis and structured data extraction
- **Customizable Output Format**: Define your own JSON schema for structured results
- **Real-time Processing**: Asynchronous job processing with status updates
- **Modern React UI**: Clean, responsive interface built with Material-UI
- **Azure Functions Backend**: Serverless backend with scalable processing

## Architecture

This application implements a modern, scalable architecture using Azure services to handle document processing and AI analysis. The system is designed to handle both quick document analysis and potentially long-running AI processing tasks.

### System Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│  React Frontend │────│  Azure Functions │────│  Azure Services │
│  (Static Web)   │    │   (Backend API)  │    │   (Processing)  │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Detailed Architecture Components

#### Frontend Layer

- **React** with Vite for fast development and building
- **Material-UI (MUI)** for modern, accessible UI components
- **React Router** for navigation
- **Axios** for API communication

#### Backend Layer - Azure Functions

- **Azure Functions** (Node.js) providing serverless API endpoints
- **Event-driven architecture** with queue-based processing
- **Asynchronous job processing** for long-running AI tasks

#### Processing Services

##### 1. Azure Document Intelligence

- **Purpose**: OCR and document structure analysis
- **Model**: Uses `prebuilt-read` for text extraction
- **Processing**: Synchronous analysis with polling for completion
- **Input**: Base64-encoded documents (PDF, images)
- **Output**: Structured text content with layout information

##### 2. Azure OpenAI Service

- **Purpose**: AI-powered content analysis and structured data extraction
- **Models**: GPT-4o or GPT-4 (configurable via deployment)
- **Processing**: Asynchronous with queue-based job system
- **Features**: JSON-structured output, customizable prompts

##### 3. Azure Storage Account

- **Blob Storage**:
  - Stores job input data (PDF context, formatting requirements)
  - Stores job status and results
  - Container: `openai-jobs`
- **Queue Storage**:
  - Manages asynchronous OpenAI processing jobs
  - Queue: `openai-jobs`
  - Enables horizontal scaling and fault tolerance

#### Data Flow & Processing Patterns

### 1. Document Analysis Flow (Fast Path)

```
User Upload → Document Intelligence → Text Extraction → Frontend Display
    ↓              ↓                      ↓
  PDF File    → Base64 Encode       → Structured Text
    ↓              ↓                      ↓
Submit API    → /api/startDocumentAnalysis → Poll Status
    ↓              ↓                      ↓
Job ID        → /api/checkDocumentStatus  → Complete
```

**Steps:**

1. User uploads PDF via frontend
2. `startDocumentAnalysis` function receives base64-encoded file
3. Azure Document Intelligence processes document (2-10 seconds)
4. Frontend polls `checkDocumentStatus` until completion
5. Raw text content returned to frontend

### 2. AI Processing Flow (Async Pattern - Sub + Poll)

```
Document Text → Submit Job → Queue Processing → Poll Status → Results
     ↓             ↓             ↓              ↓           ↓
  Structured   → Job Created → Worker Function → Status    → JSON
    Input         in Blob       Processes        Updates     Output
                    ↓             ↓              ↓           ↓
                 Queued     → OpenAI API    → Blob Storage → Frontend
```

**Detailed Sub + Poll Pattern:**

#### Subscription Phase (Submit):

1. **Job Submission** (`/api/openai/jobs` - POST)
   - Creates unique job ID (UUID)
   - Stores input data in blob: `{jobId}.input.json`
   - Stores initial status in blob: `{jobId}.status.json`
   - Enqueues job message in Azure Storage Queue
   - Returns job ID and status URL to frontend

#### Processing Phase (Background):

2. **Queue Worker** (`openai-jobs-worker` - Storage Queue Trigger)
   - Triggered automatically when job added to queue
   - Retrieves job input from blob storage
   - Updates status to "running"
   - Calls Azure OpenAI API with:
     - System prompt for resume parsing
     - User-defined JSON format
     - Additional context instructions
     - PDF text content
   - Processes response (JSON parsing, error handling)
   - Updates final status and result in blob storage

#### Polling Phase (Status Monitoring):

3. **Status Polling** (`/api/openai/jobs/{jobId}` - GET)
   - Frontend polls this endpoint every 2 seconds
   - Returns current job status from blob storage
   - Possible statuses: `queued`, `running`, `succeeded`, `failed`
   - When `succeeded`, returns parsed JSON result
   - Includes error details if `failed`

### Benefits of Sub + Poll Pattern

#### Scalability

- **Horizontal scaling**: Multiple queue workers can process jobs in parallel
- **Load distribution**: Queue automatically balances work across available instances
- **No timeout limits**: Long-running AI processing doesn't block HTTP requests

#### Reliability

- **Fault tolerance**: Failed jobs can be retried automatically
- **Persistence**: Job state persists in blob storage
- **Monitoring**: Full audit trail of job processing

#### User Experience

- **Non-blocking**: Users can continue using the application
- **Real-time updates**: Status polling provides immediate feedback
- **Progress tracking**: Clear indication of processing stages

### Performance Characteristics

#### Document Intelligence

- **Latency**: 2-10 seconds for typical documents
- **Throughput**: High (direct API calls)
- **Limitations**: 50MB file size limit

#### OpenAI Processing

- **Latency**: 10-60 seconds depending on content complexity
- **Throughput**: Depends on OpenAI service limits and quotas
- **Queue capacity**: Virtually unlimited with Azure Storage Queues
- **Concurrent processing**: Configurable based on Azure Functions scaling

### Error Handling & Monitoring

#### Automatic Retries

- Queue messages automatically retry on failure (configurable)
- Dead letter queues for permanently failed jobs
- Exponential backoff for transient failures

#### Logging & Observability

- Azure Functions built-in logging
- Application Insights integration (optional)
- Blob storage provides full audit trail
- Job status tracking with timestamps

This architecture ensures the application can handle both quick document processing and potentially long-running AI analysis tasks while maintaining responsiveness and reliability.

### API Endpoints

- `POST /api/startDocumentAnalysis` - Initialize document analysis
- `GET /api/checkDocumentStatus` - Check analysis status
- `POST /api/openai/jobs` - Submit Azure OpenAI processing job
- `GET /api/openai/jobs/{jobId}` - Check Azure OpenAI job status

## Getting Started

### Prerequisites

- **Node.js** (v20 or later)
- **Azure CLI** (for deployment)
- **Azure Functions Core Tools** (v4)
- **Azure Subscription** with the following services:
  - Azure Document Intelligence
  - Azure Storage Account
  - Azure OpenAI Service with a deployed model

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
    "AZURE_OPENAI_ENDPOINT": "your_azure_openai_endpoint",
    "AZURE_OPENAI_KEY": "your_azure_openai_key",
    "AZURE_OPENAI_DEPLOYMENT_NAME": "your_model_deployment_name",
    "AZURE_OPENAI_API_VERSION": "2025-01-01-preview"
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

### Azure OpenAI Setup

This application requires an Azure OpenAI Service. Follow these steps:

1. **Create an Azure OpenAI resource**

   - Go to Azure Portal → Create Resource → Azure OpenAI
   - Choose your subscription, resource group, and region
   - Select the pricing tier

2. **Deploy a model**

   - In your Azure OpenAI resource, go to "Model deployments"
   - Click "Create new deployment"
   - Select a model (recommended: `gpt-4o` or `gpt-4`)
   - Give your deployment a name (e.g., `gpt-4o-cvparser`)
   - Note this deployment name for your environment variables

3. **Configure environment variables**
   - `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint URL
   - `AZURE_OPENAI_KEY`: Your Azure OpenAI API key (found in "Keys and Endpoint")
   - `AZURE_OPENAI_DEPLOYMENT_NAME`: The name you gave to your model deployment
   - `AZURE_OPENAI_API_VERSION`: API version (default: `2025-01-01-preview`)

**Note**: All Azure OpenAI environment variables must be set for the application to work properly.

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

### Deploy using Azure Static Web Apps & Azure Functions

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

   ##### Create a Function App with Flex Consumption Plan

   1. Go to the [Azure Portal](https://portal.azure.com).
   2. Search for **"Function App"** and click **Create**.
   3. Choose your **Subscription** and **Resource Group**.
   4. Enter a **Name** for your Function App.
   5. Select the **Region**.
   6. For **Hosting**, select **Flex Consumption** (this will automatically create the Flex plan for you).
   7. Choose **Node.js** as the runtime stack and select **Version 20**.
   8. Select or create a **Storage Account**.
   9. Complete any additional configuration as needed.
   10. Click **Review + create**, then **Create**.

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
   AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
   AZURE_OPENAI_KEY=your_azure_openai_key
   AZURE_OPENAI_DEPLOYMENT_NAME=your_model_deployment_name
   AZURE_OPENAI_API_VERSION=2025-01-01-preview
   AzureWebJobsStorage=your_storage_connection_string
   ```

2. **No frontend environment variables needed** - API calls will automatically route to `/api/*` through the Static Web App integration.

### Environment Variables for Production

Ensure the following environment variables are set in your Azure Function App:

- `DOCUMENT_INTELLIGENCE_KEY`
- `DOCUMENT_INTELLIGENCE_ENDPOINT`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT_NAME`
- `AZURE_OPENAI_API_VERSION` (optional, defaults to `2025-01-01-preview`)
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
