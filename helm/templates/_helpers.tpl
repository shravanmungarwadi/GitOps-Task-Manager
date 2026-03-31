{{/*
============================================================
_helpers.tpl — Reusable template snippets for all resources
Defines naming conventions, labels, and selectors used across
every template file in this chart
============================================================
*/}}

{{/*
Chart name, truncated to 63 characters (Kubernetes DNS limit)
*/}}
{{- define "taskmanager.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Full resource name combining release name and chart name
Avoids duplication if release name already contains chart name
Truncated to 63 characters with trailing hyphen removed
*/}}
{{- define "taskmanager.fullname" -}}
{{- $name := .Chart.Name -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Chart label value combining chart name and version
Replaces "+" with "_" since "+" is not allowed in label values
*/}}
{{- define "taskmanager.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels applied to every resource in this chart
Includes selector labels plus chart version and manager info
*/}}
{{- define "taskmanager.labels" -}}
helm.sh/chart: {{ include "taskmanager.chart" . }}
{{ include "taskmanager.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels used for matching pods to services and deployments
Kept minimal because selectors are immutable after creation
*/}}
{{- define "taskmanager.selectorLabels" -}}
app.kubernetes.io/name: {{ include "taskmanager.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}