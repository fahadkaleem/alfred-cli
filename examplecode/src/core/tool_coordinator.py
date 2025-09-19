"""Tool coordination and management for the Claude Code agent"""
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from src.core.tool_definition import ToolDefinition
from src.core.tool_response import ToolResponse
from src.core.tool_registry import ToolRegistry
from src.core.console_renderer import ConsoleRenderer
from src.cli.spinner import LoadingSpinner


class ToolExecutionStatus(Enum):
    """Status of tool execution"""
    SUCCESS = "success"
    FAILED = "failed"
    NOT_FOUND = "not_found"
    VALIDATION_ERROR = "validation_error"


@dataclass
class ToolExecutionResult:
    """Result of a tool execution"""
    tool_id: str
    tool_name: str
    status: ToolExecutionStatus
    result: Any
    error_message: Optional[str] = None
    display_content: Optional[str] = None




class ToolCoordinator:
    """Coordinates tool discovery, execution, and result handling"""
    
    def __init__(self):
        """Initialize the tool coordinator"""
        # Ensure tools are initialized
        if not ToolRegistry.is_initialized():
            from src.tools import initialize_tools
            initialize_tools()
        
        self.renderer = ConsoleRenderer()
        self.execution_history: List[ToolExecutionResult] = []
    
    def execute_tool_call(
        self, 
        tool_name: str, 
        tool_input: Dict[str, Any],
        tool_id: Optional[str] = None
    ) -> ToolExecutionResult:
        """Execute a single tool call and return the result"""
        # Get tool instance from registry
        tool_instance = ToolRegistry.create_tool_instance(tool_name)
        
        if not tool_instance:
            return ToolExecutionResult(
                tool_id=tool_id or "",
                tool_name=tool_name,
                status=ToolExecutionStatus.NOT_FOUND,
                result=None,
                error_message=f"Tool '{tool_name}' not found"
            )
        
        try:
            # Get tool definition
            tool_def = tool_instance.definition
            
            # Validate input with Pydantic
            validated_input = tool_def.input_schema(**tool_input)
            
            # Execute the tool function
            result = tool_def.function(**validated_input.model_dump())
            
            # Handle result based on type
            if isinstance(result, ToolResponse):
                status = ToolExecutionStatus.SUCCESS if result.success else ToolExecutionStatus.FAILED
                execution_result = ToolExecutionResult(
                    tool_id=tool_id or "",
                    tool_name=tool_name,
                    status=status,
                    result=result.raw_result,
                    display_content=result.display_content
                )
            else:
                # Legacy string result
                execution_result = ToolExecutionResult(
                    tool_id=tool_id or "",
                    tool_name=tool_name,
                    status=ToolExecutionStatus.SUCCESS if "Error" not in str(result) else ToolExecutionStatus.FAILED,
                    result=result,
                    display_content=str(result)[:100] + "..." if len(str(result)) > 100 else str(result)
                )
            
            # Track execution
            self.execution_history.append(execution_result)
            return execution_result
            
        except ValueError as e:
            # Validation error
            return ToolExecutionResult(
                tool_id=tool_id or "",
                tool_name=tool_name,
                status=ToolExecutionStatus.VALIDATION_ERROR,
                result=None,
                error_message=f"Validation error: {str(e)}"
            )
        except Exception as e:
            # Execution error
            return ToolExecutionResult(
                tool_id=tool_id or "",
                tool_name=tool_name,
                status=ToolExecutionStatus.FAILED,
                result=None,
                error_message=f"Execution error: {str(e)}"
            )
    
    def execute_tool_calls(
        self,
        tool_calls: List[Dict[str, Any]],
        spinner: Optional[LoadingSpinner] = None
    ) -> List[Tuple[str, str]]:
        """Execute multiple tool calls and return formatted results"""
        results = []
        
        for tool_call in tool_calls:
            # Start spinner if provided
            if spinner:
                spinner.start()
            
            # Execute the tool
            execution_result = self.execute_tool_call(
                tool_name=tool_call["name"],
                tool_input=tool_call["input"],
                tool_id=tool_call.get("id")
            )
            
            # Stop spinner if provided
            if spinner:
                spinner.stop()
            
            # Render the result
            self._render_execution_result(
                tool_call["name"],
                tool_call["input"],
                execution_result
            )
            
            # Format result for conversation
            result_content = execution_result.result if execution_result.result else execution_result.error_message
            if not result_content or not str(result_content).strip():
                result_content = "No output"
            
            results.append((tool_call["id"], str(result_content)))
        
        return results
    
    def _render_execution_result(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        execution_result: ToolExecutionResult
    ) -> None:
        """Render the tool execution result to console"""
        # Create a ToolResponse for rendering
        if execution_result.status == ToolExecutionStatus.SUCCESS:
            response = ToolResponse(
                success=True,
                display_content=execution_result.display_content or "Success",
                raw_result=execution_result.result
            )
        else:
            response = ToolResponse(
                success=False,
                display_content=execution_result.error_message or "Failed",
                raw_result=execution_result.error_message
            )
        
        self.renderer.render(tool_name, tool_input, response)
    
    def get_tool_schemas_for_api(self) -> List[Dict[str, Any]]:
        """Get tool schemas formatted for Claude API"""
        schemas = []
        
        # Get all tool classes and create schemas
        for tool_name, tool_class in ToolRegistry.get_all_tool_classes().items():
            tool_instance = tool_class()
            tool_def = tool_instance.definition
            schema = {
                "name": tool_def.name,
                "description": tool_def.description,
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
            
            # Convert Pydantic schema to API format
            model_schema = tool_def.input_schema.model_json_schema()
            if "properties" in model_schema:
                schema["input_schema"]["properties"] = model_schema["properties"]
            if "required" in model_schema:
                schema["input_schema"]["required"] = model_schema["required"]
            
            schemas.append(schema)
        
        return schemas
    
    def get_available_tools(self) -> List[str]:
        """Get list of available tool names"""
        return ToolRegistry.get_tool_names()
    
    def get_execution_history(self) -> List[ToolExecutionResult]:
        """Get the history of tool executions"""
        return self.execution_history
    
    def clear_history(self) -> None:
        """Clear the execution history"""
        self.execution_history = []
    
    def validate_tool_call(self, tool_name: str, tool_input: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate a tool call without executing it"""
        tool_instance = ToolRegistry.create_tool_instance(tool_name)
        
        if not tool_instance:
            return False, f"Tool '{tool_name}' not found"
        
        try:
            # Try to validate input
            tool_def = tool_instance.definition
            tool_def.input_schema(**tool_input)
            return True, None
        except Exception as e:
            return False, str(e)