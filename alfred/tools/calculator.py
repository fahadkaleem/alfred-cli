"""Calculator tool for mathematical operations."""

import ast
import operator
from alfred.tools.base import Tool


# Safe operators for calculator
SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
}


class CalculatorTool(Tool):
    """Tool for performing safe mathematical calculations."""

    @property
    def name(self) -> str:
        return "calculator"

    @property
    def description(self) -> str:
        return "Perform safe mathematical calculations. Supports +, -, *, /, **, %"

    def execute(self, expression: str) -> str:
        """Execute mathematical calculation.

        Args:
            expression: Mathematical expression to evaluate

        Returns:
            String result of the calculation
        """
        try:
            result = self._safe_eval(expression)
            return f"{expression} = {result}"
        except Exception as e:
            return f"Error: {str(e)}"

    def _safe_eval(self, expression: str) -> float:
        """Safely evaluate mathematical expressions using AST."""
        try:
            node = ast.parse(expression, mode='eval')
            return self._eval_node(node.body)
        except Exception:
            raise ValueError(f"Invalid expression: {expression}")

    def _eval_node(self, node):
        """Recursively evaluate AST nodes safely."""
        if isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.BinOp):
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)
            op_type = type(node.op)
            if op_type not in SAFE_OPERATORS:
                raise ValueError(f"Unsupported operator: {op_type.__name__}")
            return SAFE_OPERATORS[op_type](left, right)
        elif isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand)
            op_type = type(node.op)
            if op_type not in SAFE_OPERATORS:
                raise ValueError(f"Unsupported operator: {op_type.__name__}")
            return SAFE_OPERATORS[op_type](operand)
        else:
            raise ValueError(f"Unsupported expression type: {type(node).__name__}")