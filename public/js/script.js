$(document).ready(function(){let yearNow=new Date().getFullYear()
  $('#year').text(yearNow)
  const $items=$('.page');const $itUnderline=$('.itUnderline')
  function checkVisibility(){$items.each(function(){const $this=$(this);const offsetTop=$this.offset().top;const scrollTop=$(window).scrollTop();const windowHeight=$(window).height();if(offsetTop<scrollTop+windowHeight-50){$this.addClass('show');$itUnderline.addClass('underlinedIT')}})}
  $(window).on('scroll',checkVisibility);checkVisibility()})
  var message=$('#message').text();var numberMessage=$('#numberMessage').text();if(message){alert(message)}
  if(numberMessage){alert(numberMessage)}