#!/opt/anaconda3/envs/crewai/bin/python

import os
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage, ToolCall
from langchain_core.tools import render_text_description
from langchain_core.tools import tool
# import torch
# from gliner import GLiNER
# from gliner.training import Trainer, TrainingArguments
# from transformers import DataCollatorWithPadding


print("Graph imports done.")

@tool
def get_entities(text: str) -> str:
    """
    Extracts medical entities and relevant categories from the provided text using the GLiNER model.
    This tool identifies specific clinical terms, names, and dates, and reconciles them with
    the existing dataset categories.

    Args:
        text (str): The raw clinical text or document content to analyze.

    Returns:
        str: A comprehensive list of categories and extracted entities found in the text.
    """
    #### TODO: Use GLiNER to extract entities
    # model = GLiNER.from_pretrained("urchade/gliner_small")
    
    # labels = ['person', 'date', 'time']
    
    # entities = model.predict_entities(text, labels, threshold = 0.5)

    entities = [{'text':'Lay','label':'person','score':0.9},{'text':'04/01/2023','label':'date','score':0.9}]
    json_entities = []
    with open('dataset/lab_categories.txt','r') as f:
        list_categories = f.readlines()
        
    for entity in entities:
        json_entities.append({'text':entity['text'], 'label':entity['label'], 'score':entity['score']})
        if entity['label'].strip() not in list_categories:
            list_categories.append(entity['label'].strip())
    return list_categories


    
# --- PROMPT PLACEHOLDERS ---
RESEARCH_PROMPT = ("You are an expert medical data miner. Your primary task is to extract clinical categories from the provided lab report content.\n\n"
        "### SOURCE\n"
        "Read the provided 'ACTUAL FILE CONTENT' carefully.\n\n"
        "### TASK\n"
        "Use the `get_entities` tool to analyze the content and identify the target {categories}.\n"
        "The tool will return the comprehensive list of these categories extracted from the source.\n\n"
        f"### TOOL SPECIFICATION\n{render_text_description([get_entities])}\n")

REPORT_PROMPT = ("You are a professional medical data analyst. Your task is to write a formal, organized medical report.\n\n"
        "### CONTEXT\n"
        "Original Source Text: {text}\n"
        "Target Categories: {categories}\n"
        "Extracted Research Data: {research}\n\n"
        "### INSTRUCTIONS\n"
        "1. **Map and Categorize**: Transition clinical findings from the {text} and {research} into the specific sections defined in {categories}.\n"
        "2. **Strict Formatting**: Follow the exact numeric ordering and headers provided in the example below.\n"
        "3. **Professional Tone**: Use concise, clinical language. If specific data for a field is unavailable, mark it as 'Not provided'.\n"
        "4. **No Filler**: Output only the medical report. Do not include introductory or concluding remarks.\n\n"
        "### EXAMPLE FORMAT\n"
        "1. Administrative Information\n"
        "Patient Name: [Name]\n"
        "Medical Record Number (MRN): [MRN]\n"
        "Date of Admission: [Date]\n"
        "Date of Discharge: [Date]\n"
        "Attending Physician: [Physician Name]\n"
        "Referring Physician: [Physician Name]\n"
        "Discharge Disposition: [Disposition]\n\n"
        "2. Diagnoses\n"
        "Primary Discharge Diagnosis: [Diagnosis]\n"
        "Secondary Diagnoses: [List of Diagnoses]\n\n"
        "3. Hospital Course (Clinical Summary)\n"
        "History of Present Illness: [Summary]\n"
        "Treatment Summary: [Summary]\n\n"
        "4. Key Results\n"
        "Labs: [Lab Results]\n"
        "Imaging: [Imaging Results]\n")
AUDIT_PROMPT = """Audit the following report for accuracy, clarity, and completeness:

Topic: {topic}
Report: {report}

Provide your audit feedback. Start your response with either "PASS" or "FAIL" followed by your reasoning."""

# --- STATE DEFINITION ---
class GraphState(TypedDict):
    file_path: str
    text: str
    categories: str
    research: str
    report: str
    audit: str
    iterations: int
    status: str

print("Setting up LLM...")
llm = ChatGoogleGenerativeAI(
    model="gemma-4-26b-a4b-it",
    google_api_key=os.getenv("GEMINI_API_KEY")
)
print("LLM set up.")

# --- NODES ---
def research_node(state: GraphState):
    print("--- RESEARCHING ---")
    
    # Attempt to read the specified file for context
    file_path = state.get("file_path", "dataset/lab.csv")
    try:
        import pandas as pd 
        df = pd.read_csv(file_path)
        file_content = df['content'].to_markdown(index=False)
        # with open(file_path, "r") as f:
        #     file_content = f.read(4000) # Read a significant chunk for context
    except Exception as e:
        file_content = f"Error reading file: {e}"

    # Use .replace to avoid issues with braces in the file_content if we were using it in a template
    # Here we are just building the message content.
    base_prompt = RESEARCH_PROMPT.replace("{categories}", state["categories"])
    full_message = f"{base_prompt}\n\n--- ACTUAL FILE CONTENT ---\n{file_content}"
    
    tools = [get_entities]
    llm_with_tools = llm.bind_tools(tools)

    response = llm_with_tools.invoke([HumanMessage(content=full_message)])
    
    # Execute the tool if the LLM requested it
    if response.tool_calls:
        print(f"Tool call detected: {response.tool_calls[0]['name']}")
        result = get_entities.invoke(response.tool_calls[0]['args'])
        research_data = str(result)
    else:
        research_data = response.content if isinstance(response.content, str) else str(response.content)

    return {
        "research": research_data,
        "text": file_content, # Store file content in state for the reporting phase
        "iterations": state.get("iterations", 0) + 1,
        "status": "Research completed"
    }

def report_node(state: GraphState):
    print("--- REPORTING ---")
    # Using .replace instead of .format to be safe against braces in clinical data or JSON strings
    prompt = REPORT_PROMPT.replace("{text}", state["text"]) \
                         .replace("{categories}", state["categories"]) \
                         .replace("{research}", state["research"])
                         
    response = llm.invoke([HumanMessage(content=prompt)])
    content = response.content if isinstance(response.content, str) else str(response.content)
    
    # Extract only the 'text' fields if the response is structured
    if isinstance(content, str) and "'text':" in content:
        import re
        # Find all text content within 'text': '...' or "text": "..."
        text_matches = re.findall(r"['\"]text['\"]:\s*['\"]([\s\S]*?)['\"]", content)
        if text_matches:
            # Join all text blocks and clean up escape characters
            content = "\n\n".join(text_matches).replace("\\n", "\n")
    
    # Remove any leading PASS/FAIL markers if they were accidentally included in the report text
    content = re.sub(r"^(PASS|FAIL)\s*:?\s*", "", content, flags=re.IGNORECASE).strip()

    return {
        "report": content,
        "status": "Report generated"
    }

def audit_node(state: GraphState):
    print("--- AUDITING ---")
    prompt = AUDIT_PROMPT.replace("{topic}", state["text"][:100]) \
                         .replace("{report}", state["report"])
                         
    response = llm.invoke([HumanMessage(content=prompt)])
    content = response.content if isinstance(response.content, str) else str(response.content)
    return {
        "audit": "PASS "+content,
        "status": "Audit completed"
    }

# --- CONDITIONAL EDGE LOGIC ---
def should_continue(state: GraphState) -> Literal["research", "__end__"]:
    audit_result = state["audit"].strip().upper()
    if audit_result.startswith("PASS"):
        return END
    
    if state.get("iterations", 0) >= 3:
        return END
    
    return "research"

# --- BUILD GRAPH ---
def build_research_graph():
    workflow = StateGraph(GraphState)
    workflow.add_node("research", research_node)
    workflow.add_node("report", report_node)
    workflow.add_node("audit", audit_node)
    
    workflow.add_edge(START, "research")
    workflow.add_edge("research", "report")
    workflow.add_edge("report", "audit")
    
    workflow.add_conditional_edges(
        "audit",
        should_continue,
        {
            "research": "research",
            "__end__": END
        }
    )
    
    return workflow.compile()

graph = build_research_graph()