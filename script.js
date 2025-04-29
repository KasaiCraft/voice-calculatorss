document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const expressionDisplay = document.getElementById('expression');
    const resultDisplay = document.getElementById('result');

    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window)) {
        alert('Speech recognition is not supported in this browser. Please use Chrome.');
        startButton.disabled = true;
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let isListening = false;

    // Convert number words to digits
    const numberMap = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
        'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
        'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
        'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
        'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
        'eighty': '80', 'ninety': '90', 'hundred': '100'
    };

    // Trigonometric function mapping
    const trigMap = {
        'sine': 'Math.sin',
        'sin': 'Math.sin',
        'sign': 'Math.sin',
        'cosine': 'Math.cos',
        'cos': 'Math.cos',
        'tangent': 'Math.tan',
        'tan': 'Math.tan',
        'pi': 'Math.PI'
    };

    startButton.addEventListener('click', () => {
        if (!isListening) {
            startListening();
        } else {
            stopListening();
        }
    });

    function startListening() {
        isListening = true;
        startButton.textContent = 'Stop Listening';
        startButton.classList.add('listening');
        expressionDisplay.textContent = 'Listening...';
        resultDisplay.textContent = '';
        recognition.start();
    }

    function stopListening() {
        isListening = false;
        startButton.textContent = 'Start Listening';
        startButton.classList.remove('listening');
        recognition.stop();
    }

    function preprocessExpression(text) {
        // Convert to lowercase and trim
        text = text.toLowerCase().trim();
        
        // Handle trigonometric functions and PI
        text = text.replace(/\b(sine of|sin of|sign of)\b/g, 'sin');
        text = text.replace(/\b(cosine of|cos of)\b/g, 'cos');
        text = text.replace(/\b(tangent of|tan of)\b/g, 'tan');
        text = text.replace(/\bpi\b/g, 'PI');
        
        // Convert degrees to radians when using trig functions
        text = text.replace(/\b(sin|cos|tan)\s+(\d+|\w+)\s+degrees/g, '$1($2 * Math.PI / 180)');
        
        // Handle parentheses
        text = text.replace(/open parenthesis|open bracket|left parenthesis/g, '(');
        text = text.replace(/close parenthesis|close bracket|right parenthesis/g, ')');
        text = text.replace(/bracket/g, '');
        
        // Replace multiplication variations
        text = text.replace(/x/g, ' times ');
        text = text.replace(/into/g, ' times ');
        text = text.replace(/multiplied by/g, ' times ');
        text = text.replace(/multiply by/g, ' times ');
        text = text.replace(/multiply/g, ' times ');
        
        // Replace other operators
        text = text.replace(/plus/g, ' + ');
        text = text.replace(/minus/g, ' - ');
        text = text.replace(/divided by/g, ' / ');
        text = text.replace(/divide by/g, ' / ');
        
        // Handle power/exponent
        text = text.replace(/power of|to the power|to the power of|raised to/g, ' ^ ');
        text = text.replace(/squared/g, ' ^ 2 ');
        text = text.replace(/cubed/g, ' ^ 3 ');
        
        // Remove filler words
        text = text.replace(/\b(the|by|and|then|equals|equal|of)\b/g, '');
        
        return text;
    }

    function convertWordsToExpression(transcript) {
        // First preprocess the text
        let text = preprocessExpression(transcript);
        
        // Split into words
        let words = text.split(/\s+/).filter(word => word.length > 0);
        let expression = [];
        let lastWasOperator = true; // To handle negative numbers at start
        
        for (let word of words) {
            // Skip empty words
            if (!word) continue;
            
            // Handle trigonometric functions
            if (trigMap[word]) {
                expression.push(trigMap[word]);
                lastWasOperator = true;
                continue;
            }
            
            // Convert number words to digits
            if (numberMap[word]) {
                expression.push(numberMap[word]);
                lastWasOperator = false;
            }
            // Handle operators and numbers
            else if (word === '+' || word === '-' || word === '/' || word === 'times' || 
                     word === '^' || word === '(' || word === ')' || !isNaN(word) ||
                     word === 'PI') {
                // Convert 'times' to '*'
                if (word === 'times') word = '*';
                // Convert PI to Math.PI
                if (word === 'PI') word = 'Math.PI';
                
                // Handle negative numbers
                if (word === '-' && lastWasOperator && !expression[expression.length - 1] === ')') {
                    expression.push('0');
                }
                
                expression.push(word);
                lastWasOperator = (word !== '(' && word !== ')' && word !== 'Math.PI');
            }
        }

        // Join and clean up the expression
        let result = expression.join('');
        
        // Convert power operator for JavaScript eval
        result = result.replace(/\^/g, '**');
        
        // Log for debugging
        console.log('Original text:', transcript);
        console.log('Preprocessed:', text);
        console.log('Final expression:', result);
        
        return result;
    }

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        
        // Show what was heard
        expressionDisplay.textContent = transcript;
        
        // Convert and calculate
        const expression = convertWordsToExpression(transcript);
        
        try {
            // Validate expression before evaluating
            if (expression && /^[0-9+\-*/(). a-zA-Z]+$/.test(expression)) {
                const result = eval(expression);
                // Format the result based on size
                let formattedResult;
                if (Math.abs(result) < 0.0001 || Math.abs(result) > 9999) {
                    formattedResult = result.toExponential(4);
                } else {
                    formattedResult = Number.isInteger(result) ? result : result.toFixed(4);
                }
                resultDisplay.textContent = `= ${formattedResult}`;
            } else {
                resultDisplay.textContent = 'Invalid expression';
                console.log('Invalid expression format:', expression);
            }
        } catch (error) {
            console.error('Error evaluating expression:', error);
            resultDisplay.textContent = 'Invalid expression';
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopListening();
    };

    recognition.onend = () => {
        if (isListening) {
            stopListening();
        }
    };
}); 