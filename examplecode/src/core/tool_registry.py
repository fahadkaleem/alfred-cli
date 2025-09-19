"""Tool registry for self-registration pattern"""
from typing import Dict, Type, Optional, List
from src.core.tool_definition import ToolDefinition


class ToolRegistry:
    """Central registry for tool registration"""
    
    _tools: Dict[str, Type] = {}
    _initialized: bool = False
    
    @classmethod
    def register(cls, tool_class: Type) -> Type:
        """
        Register a tool class. Used as a decorator.
        
        @ToolRegistry.register
        class MyTool(BaseTool):
            ...
        """
        # Store the class itself - we'll get the name when needed
        # This avoids creating instances at import time
        cls._tools[tool_class.__name__] = tool_class
        
        return tool_class
    
    @classmethod
    def get_tool_class(cls, name: str) -> Optional[Type]:
        """Get a tool class by tool name (not class name)"""
        # Map from tool name to class
        for class_name, tool_class in cls._tools.items():
            try:
                instance = tool_class()
                if instance.definition.name == name:
                    return tool_class
            except:
                # If we can't instantiate, skip
                continue
        return None
    
    @classmethod
    def get_all_tool_classes(cls) -> Dict[str, Type]:
        """Get all registered tool classes mapped by tool name"""
        result = {}
        for class_name, tool_class in cls._tools.items():
            try:
                instance = tool_class()
                result[instance.definition.name] = tool_class
            except:
                # Skip tools that can't be instantiated
                continue
        return result
    
    @classmethod
    def get_tool_names(cls) -> List[str]:
        """Get names of all registered tools"""
        names = []
        for class_name, tool_class in cls._tools.items():
            try:
                instance = tool_class()
                names.append(instance.definition.name)
            except:
                # Skip tools that can't be instantiated
                continue
        return names
    
    @classmethod
    def create_tool_instance(cls, name: str):
        """Create an instance of a tool by tool name"""
        tool_class = cls.get_tool_class(name)
        if tool_class:
            return tool_class()
        return None
    
    @classmethod
    def clear(cls):
        """Clear all registrations (mainly for testing)"""
        cls._tools.clear()
        cls._initialized = False
    
    @classmethod
    def is_initialized(cls) -> bool:
        """Check if tools have been initialized"""
        return cls._initialized
    
    @classmethod
    def mark_initialized(cls):
        """Mark registry as initialized"""
        cls._initialized = True