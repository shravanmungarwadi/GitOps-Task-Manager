# 📊 Project Diagrams

All architecture and flow diagrams for GitOps Task Manager.

---

## 1. Complete GitOps Pipeline Flow

```mermaid
%%{init: {'theme': 'neutral'}}%%
graph TD
    Dev[👨‍💻 Developer] -->|git push to main| GitHub[🐙 GitHub Repository]
    GitHub -->|triggers| Actions[⚡ GitHub Actions CI/CD]

    subgraph CI/CD Pipeline - 4 Jobs
        Actions --> J1[✅ Job 1 - Run Tests]
        J1 --> J2[🔒 Job 2 - Trivy Security Scan]
        J2 --> J3[🐳 Job 3 - Build and Push Docker Images]
        J3 --> J4[🏷️ Job 4 - Update Image Tag in helm/values.yaml]
    end

    J3 -->|push images| DockerHub[🐳 Docker Hub - shravanvm]
    J4 -->|commits image tag back| GitHub
    GitHub -->|auto detects new commit| ArgoCD[⚙️ ArgoCD - GitOps Controller]

    subgraph AWS EKS Cluster - ap-south-1
        ArgoCD -->|runs helm internally| Nginx[🔀 Nginx Ingress Controller]
        Nginx -->|path /api| Backend[🟢 Node.js Backend - 2 replicas]
        Nginx -->|path /| Frontend[⚛️ React Frontend - 2 replicas]
        Backend -->|SQL queries| DB[(🐘 PostgreSQL + EBS gp2)]
        Backend -->|exposes /metrics| Prometheus[📊 Prometheus]
        Prometheus -->|visualizes| Grafana[📈 Grafana Dashboards]
    end

    Terraform[🏗️ Terraform IaC] -->|provisions| VPC[🌐 AWS VPC]
    Terraform -->|provisions| EKS[☸️ AWS EKS Cluster]
    Terraform -->|remote state| S3[(🪣 S3 + DynamoDB Lock)]

    User[🌍 Internet User] -->|HTTP request| ELB[⚖️ AWS Elastic Load Balancer]
    ELB -->|forwards traffic| Nginx
```

---

## 2. AWS Infrastructure Layout

```mermaid
%%{init: {'theme': 'neutral'}}%%
graph TB
    subgraph AWS Account - 239372727545
        subgraph VPC - 10.0.0.0/16
            subgraph Public Subnets - ELB lives here
                PubA[Public Subnet AZ-a\n10.0.1.0/24]
                PubB[Public Subnet AZ-b\n10.0.2.0/24]
                IGW[🌐 Internet Gateway]
                NAT[NAT Gateway + Elastic IP]
                ELB_R[⚖️ AWS ELB\nauto-provisioned by K8s]
            end

            subgraph Private Subnets - Worker nodes live here
                subgraph EKS Node 1 - t3.medium
                    N1[Backend pod x2\nFrontend pod x2]
                end
                subgraph EKS Node 2 - t3.medium
                    N2[Postgres pod\nArgoCD pods\nPrometheus + Grafana]
                end
            end

            subgraph EKS Control Plane - Managed by AWS
                CP[Kubernetes API Server\nScheduler + etcd]
            end
        end

        subgraph Terraform Remote State
            S3_B[(S3 Bucket\ngitops-taskmanager-tfstate)]
            DDB[(DynamoDB Table\ngitops-taskmanager-tflock)]
        end
    end

    Internet[🌍 Internet] -->|HTTPS| ELB_R
    ELB_R --> PubA
    PubA --> N1
    PubB --> N2
    NAT -->|outbound only| Internet
    CP -->|manages| N1
    CP -->|manages| N2
```

---

## 3. CI/CD Pipeline - Detailed Job Breakdown

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart LR
    Push([📤 git push\nto main]) --> J1

    subgraph Job 1 - Tests
        J1[npm install] --> J1B[npm test\nbackend]
    end

    subgraph Job 2 - Security Scan
        J2[docker build\ntemp image] --> J2B[trivy image scan\ncheck CVEs]
        J2B --> J2C{Critical\nvulns?}
        J2C -->|yes| FAIL([❌ Pipeline\nFails])
        J2C -->|no| PASS([✅ Continue])
    end

    subgraph Job 3 - Build and Push
        J3[docker build\nmulti-stage] --> J3B[tag with\nGit SHA]
        J3B --> J3C[docker push\nto Docker Hub]
    end

    subgraph Job 4 - Update Helm
        J4[sed replace\nimage tag in\nhelm/values.yaml] --> J4B[git commit\nand push back\nto GitHub]
    end

    J1B --> J2
    PASS --> J3
    J3C --> J4
    J4B -->|triggers| ArgoCD([⚙️ ArgoCD\nauto-deploys])
```

---

## 4. ArgoCD GitOps Sync Loop

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant Dev as 👨‍💻 Developer
    participant GH as 🐙 GitHub
    participant CI as ⚡ GitHub Actions
    participant DH as 🐳 Docker Hub
    participant Argo as ⚙️ ArgoCD
    participant EKS as ☸️ AWS EKS

    Dev->>GH: git push to main
    GH->>CI: trigger pipeline
    CI->>CI: run tests
    CI->>CI: trivy security scan
    CI->>DH: push new image sha-abc1234
    CI->>GH: commit updated helm/values.yaml

    Note over Argo: polls GitHub every 3 minutes
    Argo->>GH: detect new commit
    Argo->>Argo: compare desired vs actual state
    Argo->>EKS: helm upgrade taskmanager
    EKS->>EKS: rolling update pods
    EKS->>EKS: old pods terminate

    Note over EKS: zero downtime deployment ✅
    Note over Argo: selfHeal=true reverts manual changes
```

---

## 5. Request Journey — User to Database

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TD
    User([🌍 Internet User\nbrowser request]) -->|HTTP port 80| ELB

    ELB[⚖️ AWS Elastic Load Balancer\nauto-created by K8s] -->|forwards| Nginx

    Nginx[🔀 Nginx Ingress Controller\npath-based routing]

    Nginx -->|path /api/*| Backend
    Nginx -->|path /health| Backend
    Nginx -->|path / everything else| Frontend

    subgraph Backend Pod - Node.js Express
        Backend[🟢 Express Router] --> Auth[🔐 JWT Middleware\nverify token]
        Auth --> Routes[📋 API Routes\ntasks, categories, auth]
        Routes --> Pool[🔗 pg connection pool]
        Routes --> Metrics[📊 prom-client\nexpose /metrics]
    end

    subgraph Frontend Pod - Nginx
        Frontend[⚛️ React App\nserved by Nginx] --> Proxy[proxy_pass /api\nto backend service]
    end

    Pool -->|SQL queries| PG[(🐘 PostgreSQL\nAWS EBS gp2 volume\nsubPath: postgres-data)]
    Metrics -->|scrape every 15s| Prometheus[📊 Prometheus]
    Prometheus --> Grafana[📈 Grafana\ncustom dashboards]
```

---

## 6. Helm Chart Structure and Value Flow

```mermaid
%%{init: {'theme': 'neutral'}}%%
graph TD
    subgraph Input Files
        VA[values.yaml\nproduction defaults]
        VD[values-dev.yml\nkind overrides]
        VP[values-prod.yml\nprod overrides]
    end

    subgraph Helm Engine
        HE[helm install / upgrade\ntemplate rendering]
        HLP[_helpers.tpl\nfullname generator]
    end

    subgraph 18 Template Files Generated
        NS[namespace.yml]
        SEC[secrets.yml]
        CM[backend-configmap.yml]
        BD[backend-deployment.yml]
        BS[backend-service.yml]
        HPA[backend-hpa.yml]
        FD[frontend-deployment.yml]
        FS[frontend-service.yml]
        FN[frontend-nginx-configmap.yml]
        PD[postgres-deployment.yml]
        PS[postgres-service.yml]
        PVC[postgres-pvc.yml]
        ING[ingress.yml]
    end

    subgraph Kubernetes Resources Created
        K1[taskmanager namespace]
        K2[backend deployment + service]
        K3[frontend deployment + service]
        K4[postgres deployment + PVC]
        K5[HPA - auto scaling]
        K6[ingress - routing rules]
    end

    VA --> HE
    VD --> HE
    VP --> HE
    HLP -->|generates fullname\ntaskmanager-gitops-taskmanager| HE
    HE --> NS & SEC & CM & BD & BS & HPA
    HE --> FD & FS & FN & PD & PS & PVC & ING
    NS --> K1
    BD & BS --> K2
    FD & FS & FN --> K3
    PD & PS & PVC --> K4
    HPA --> K5
    ING --> K6
```

---

## 7. Monitoring Architecture

```mermaid
%%{init: {'theme': 'neutral'}}%%
graph LR
    subgraph Node.js Backend
        Code[Express routes] -->|every request| PC[prom-client]
        PC -->|Counter| M1[http_requests_total]
        PC -->|Histogram| M2[http_request_duration_seconds]
        PC -->|Gauge| M3[active_connections]
        M1 & M2 & M3 --> EP[/metrics endpoint]
    end

    subgraph Kubernetes
        SM[ServiceMonitor\nbackend-servicemonitor.yml] -->|selector:\napp.kubernetes.io/component: backend| SVC[backend Service]
        SVC --> EP
    end

    subgraph Monitoring Namespace
        PROM[📊 Prometheus\nkube-prometheus-stack] -->|scrape every 15s| SM
        PROM -->|stores time-series| TSDB[(TSDB\nTime Series DB)]
        TSDB -->|PromQL queries| GR[📈 Grafana]
    end

    subgraph Grafana Dashboards
        GR --> D1[Kubernetes / Compute Resources\nCPU + Memory]
        GR --> D2[Kubernetes / API Server\n100% availability SLO]
        GR --> D3[Kubernetes / Networking\nbandwidth metrics]
        GR --> D4[GitOps Task Manager\ncustom app dashboard]
    end

    ELB_G[⚖️ AWS ELB\nGrafana LoadBalancer] --> GR
    Browser[🌍 Browser] --> ELB_G
```

---

## 8. Destroy Sequence — Why Order Matters

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TD
    START([bash scripts/destroy.sh]) --> S1

    S1[Step 1\nDelete ArgoCD Application] -->|ArgoCD cleans up\ntaskmanager namespace| S2
    S2[Step 2\nHelm uninstall Prometheus + Grafana] -->|Grafana ELB deleted\nby Kubernetes| S3
    S3[Step 3\nHelm uninstall Nginx Ingress] -->|App ELB deleted\nby Kubernetes| WAIT

    WAIT[Wait 90 seconds\nfor AWS to fully remove ELBs] --> CHECK

    CHECK{ELBs\ngone?} -->|yes| S4
    CHECK -->|no - force delete| FDEL[aws elb delete-load-balancer]
    FDEL --> S4

    S4[Step 4\nDelete ArgoCD namespace] -->|ArgoCD ELB deleted| S5
    S5[Step 5\nterraform destroy -auto-approve] -->|destroys 26 AWS resources| S6

    S6{VPC deleted\nsuccessfully?} -->|yes| DONE
    S6 -->|no - DependencyViolation| ERR[ELB still exists!\nDelete manually first]

    DONE([✅ Destroy complete\nZero charges running])
    ERR -->|fix then retry| S5
```

---

## 9. Terraform State Management

```mermaid
%%{init: {'theme': 'neutral'}}%%
graph TD
    subgraph Developer Machine - WSL2
        TF[terraform apply] -->|reads| CFG[6 .tf files\nbackend, variables\nmain, vpc, eks, outputs]
        CFG -->|downloads| PROV[AWS Provider Plugin\n.terraform/ folder - never in git]
    end

    subgraph Remote State - Always Free
        S3_B[(S3 Bucket\ngitops-taskmanager-tfstate\neks/terraform.tfstate)]
        DDB[(DynamoDB Table\ngitops-taskmanager-tflock\nLockID entry)]
    end

    subgraph AWS Resources Created - 26 total
        VPC_R[VPC + Subnets\n+ IGW + NAT]
        EKS_R[EKS Cluster\n+ Node Group]
        IAM_R[IAM Roles\n+ Policies]
        EBS_R[EBS CSI Driver\nAddon]
    end

    TF -->|acquires lock| DDB
    TF -->|reads current state| S3_B
    TF -->|creates resources| VPC_R & EKS_R & IAM_R & EBS_R
    TF -->|saves new state| S3_B
    TF -->|releases lock| DDB
```

---

## 10. Phase Journey — 0 to Production

```mermaid
%%{init: {'theme': 'neutral'}}%%
journey
    title GitOps Task Manager - Phase by Phase Journey
    section Local Development
      Write Node.js backend: 5: Developer
      Write React frontend: 5: Developer
      Test locally with PostgreSQL: 4: Developer
    section Containerization
      Write multi-stage Dockerfiles: 4: Developer
      Add non-root users: 3: Developer
      Test with Docker Compose: 5: Developer
    section Kubernetes
      Write 13+ K8s manifests: 3: Developer
      Deploy to kind cluster: 4: Developer
      Configure Nginx Ingress: 3: Developer
    section GitOps
      Install ArgoCD: 4: Developer
      Connect to GitHub repo: 4: Developer
      Verify auto-sync works: 5: Developer
    section CI/CD
      Write 4-job GitHub Actions: 3: Developer
      Fix Job 4 permissions: 2: Developer
      Verify full pipeline green: 5: Developer
    section Helm
      Write 18 Helm templates: 3: Developer
      Debug fullname collisions: 2: Developer
      Verify on kind cluster: 5: Developer
    section Monitoring
      Add prom-client metrics: 4: Developer
      Configure ServiceMonitor: 3: Developer
      Build Grafana dashboard: 4: Developer
    section Cloud Production
      Write 6 Terraform files: 3: Developer
      Fix EBS CSI driver: 2: Developer
      Fix subPath postgres: 2: Developer
      App live on AWS EKS: 5: Developer
    section Portfolio
      Write README with diagrams: 5: Developer
      Document all 32 bugs: 4: Developer
      Project complete: 5: Developer
```
